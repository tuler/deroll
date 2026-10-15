// Generates test/fixtures/batch-vectors.json from the canonical Rust types in
// sequencer-core (batch.rs, fee.rs) and a mirror of the scheduler's private
// recover_sender. Run with scripts/generate-fixtures.sh; never edit the JSON by hand.
use alloy_primitives::{address, hex, Address, Signature, U256};
use alloy_sol_types::{Eip712Domain, SolStruct};
use k256::ecdsa::signature::hazmat::PrehashSigner;
use k256::ecdsa::SigningKey;
use sequencer_core::batch::{Batch, Frame, WireUserOp};
use sequencer_core::fee::{fee_to_linear, MAX_EXPONENT};
use sequencer_core::user_op::UserOp;
use serde_json::{json, Value};
use ssz::{Decode, Encode};

const APP: Address = address!("ab7528bb862fb57e8a2bcd567a2e929a0be56a5e");
const CHAIN: u64 = 31337;
const N: U256 = alloy_primitives::uint!(0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141_U256);

fn domain(chain_id: u64) -> Eip712Domain {
    sequencer_core::build_input_domain(chain_id, APP)
}

/// Mirror of Scheduler::recover_sender (private).
fn recover_sender(domain: &Eip712Domain, op: &WireUserOp) -> Option<Address> {
    if op.signature.len() != WireUserOp::SIGNATURE_BYTES {
        return None;
    }
    let signature = Signature::from_raw(op.signature.as_slice()).ok()?;
    let hash = op.to_user_op().eip712_signing_hash(domain);
    signature.recover_address_from_prehash(&hash).ok()
}

fn key(byte: u8) -> SigningKey {
    SigningKey::from_bytes(&[byte; 32].into()).unwrap()
}

fn signed_op(sk: &SigningKey, chain_id: u64, nonce: u32, max_fee: u16, data: Vec<u8>) -> WireUserOp {
    let op = UserOp { nonce, max_fee, data: data.clone().into() };
    let hash = op.eip712_signing_hash(&domain(chain_id));
    let (sig, recid) = sk.sign_prehash(hash.as_slice()).map(|s: (k256::ecdsa::Signature, k256::ecdsa::RecoveryId)| s).unwrap();
    let signature = Signature::from_signature_and_parity(sig, recid.is_y_odd());
    WireUserOp { nonce, max_fee, data, signature: signature.as_bytes().to_vec() }
}

fn op_json(op: &WireUserOp) -> Value {
    json!({
        "nonce": op.nonce,
        "max_fee": op.max_fee,
        "data": format!("0x{}", hex::encode(&op.data)),
        "signature": format!("0x{}", hex::encode(&op.signature)),
    })
}

fn batch_json(b: &Batch) -> Value {
    json!({
        "nonce": b.nonce.to_string(),
        "frames": b.frames.iter().map(|f| json!({
            "safe_block": f.safe_block.to_string(),
            "fee_price": f.fee_price,
            "user_ops": f.user_ops.iter().map(op_json).collect::<Vec<_>>(),
        })).collect::<Vec<_>>(),
    })
}

/// Compact, exact rendering of a decoded batch, mirrored by `digest` in the TS
/// test: `nonce|safe_block/fee_price/op,op;frame...`, an op being
/// `nonce.max_fee.data.signature` in hex.
fn digest(b: &Batch) -> String {
    let frames = b.frames.iter().map(|f| {
        let ops = f.user_ops.iter()
            .map(|op| format!("{}.{}.{}.{}", op.nonce, op.max_fee, hex::encode(&op.data), hex::encode(&op.signature)))
            .collect::<Vec<_>>()
            .join(",");
        format!("{}/{}/{}", f.safe_block, f.fee_price, ops)
    }).collect::<Vec<_>>();
    format!("{}|{}", b.nonce, frames.join(";"))
}

fn verdict(bytes: &[u8]) -> Value {
    let hex = format!("0x{}", hex::encode(bytes));
    match Batch::from_ssz_bytes(bytes) {
        Ok(b) => json!([hex, digest(&b)]),
        Err(_) => json!([hex, null]),
    }
}

fn h(s: &str) -> Vec<u8> {
    hex::decode(s).unwrap()
}

fn main() {
    let alice = key(0x11);
    let bob = key(0x22);
    let limit = h("0000000000000007030000000000435442000000000009eb150100000000000000010200000000");
    let cancel = h("0000000000000007040000000000003039");
    let market = h("000000000000002a050000000000485445000000000000000503000000000000000f010101");
    let withdraw = h("000000000000002a02000000000000006400");

    // ── Valid batches ──
    let mut valid = vec![];
    let mut push = |name: &str, b: Batch| {
        let bytes = b.as_ssz_bytes();
        assert_eq!(Batch::from_ssz_bytes(&bytes).unwrap(), b);
        valid.push(json!({ "name": name, "bytes": format!("0x{}", hex::encode(&bytes)), "batch": batch_json(&b) }));
    };
    push("empty", Batch { nonce: 0, frames: vec![] });
    push("empty-frame", Batch { nonce: 1, frames: vec![Frame { user_ops: vec![], safe_block: 7, fee_price: 0 }] });
    let sample_op = |nonce| WireUserOp { nonce, max_fee: 100, data: vec![0xaa, 0xbb, 0xcc, 0xdd], signature: vec![0xee; 65] };
    push("rust-sample", Batch {
        nonce: 42,
        frames: (0..3).map(|i| Frame { user_ops: (0..2).map(sample_op).collect(), safe_block: 100 + i, fee_price: 42 }).collect(),
    });
    push("extremes", Batch {
        nonce: u64::MAX,
        frames: vec![Frame {
            user_ops: vec![WireUserOp { nonce: u32::MAX, max_fee: u16::MAX, data: vec![], signature: vec![] }],
            safe_block: u64::MAX,
            fee_price: u16::MAX,
        }],
    });
    let mixed = Batch {
        nonce: 3,
        frames: vec![
            Frame {
                user_ops: vec![
                    signed_op(&alice, CHAIN, 0, 1200, limit.clone()),
                    signed_op(&alice, CHAIN, 1, 1200, cancel.clone()),
                    signed_op(&bob, CHAIN, 9, 0, market.clone()),
                ],
                safe_block: 1000,
                fee_price: 5,
            },
            Frame { user_ops: vec![], safe_block: 1001, fee_price: 5 },
            Frame {
                user_ops: vec![
                    signed_op(&bob, CHAIN, 10, 65535, withdraw.clone()),
                    // Bad signature (all zero) and a short one: both decode, neither recovers.
                    WireUserOp { nonce: 11, max_fee: 7, data: withdraw.clone(), signature: vec![0; 65] },
                    WireUserOp { nonce: 12, max_fee: 7, data: vec![0x01, 0x02], signature: vec![0x1b; 10] },
                ],
                safe_block: 1002,
                fee_price: 6,
            },
        ],
    };
    push("mixed", mixed.clone());

    let d = domain(CHAIN);
    let senders = mixed.frames.iter().flat_map(|f| f.user_ops.iter())
        .map(|op| recover_sender(&d, op).map(|a| a.to_string()))
        .collect::<Vec<_>>();
    let signers = json!({
        "alice": Address::from_private_key(&alice).to_string(),
        "bob": Address::from_private_key(&bob).to_string(),
    });

    // ── Signature edge cases, each against the same message ──
    let base = signed_op(&alice, CHAIN, 5, 300, limit.clone());
    let sig = Signature::from_raw(&base.signature).unwrap();
    let rs = |r: U256, s: U256, v: u8| {
        let mut out = r.to_be_bytes::<32>().to_vec();
        out.extend_from_slice(&s.to_be_bytes::<32>());
        out.push(v);
        out
    };
    let parity = sig.v() as u8;
    let mut cases: Vec<(String, Vec<u8>, u64)> = vec![
        ("canonical-27-28".into(), base.signature.clone(), CHAIN),
        ("parity-0-1".into(), rs(sig.r(), sig.s(), parity), CHAIN),
        ("flipped-parity".into(), rs(sig.r(), sig.s(), 27 + (1 - parity)), CHAIN),
        ("high-s".into(), rs(sig.r(), N - sig.s(), 27 + (1 - parity)), CHAIN),
        ("high-s-uncorrected-parity".into(), rs(sig.r(), N - sig.s(), 27 + parity), CHAIN),
        ("r-zero".into(), rs(U256::ZERO, sig.s(), 27 + parity), CHAIN),
        ("s-zero".into(), rs(sig.r(), U256::ZERO, 27 + parity), CHAIN),
        ("r-eq-n".into(), rs(N, sig.s(), 27 + parity), CHAIN),
        ("s-eq-n".into(), rs(sig.r(), N, 27 + parity), CHAIN),
        ("r-max".into(), rs(U256::MAX, sig.s(), 27 + parity), CHAIN),
        ("len-64".into(), base.signature[..64].to_vec(), CHAIN),
        ("len-66".into(), [base.signature.clone(), vec![0]].concat(), CHAIN),
        ("len-0".into(), vec![], CHAIN),
        ("other-chain".into(), base.signature.clone(), 1),
    ];
    // Small r values: some are not the x coordinate of a curve point.
    for r in 1u64..=8 {
        cases.push((format!("r-{r}"), rs(U256::from(r), sig.s(), 27 + parity), CHAIN));
    }
    for v in 0u8..=255 {
        cases.push((format!("v-{v}"), rs(sig.r(), sig.s(), v), CHAIN));
    }
    let signature_cases = cases.iter().map(|(name, s, chain)| {
        let op = WireUserOp { signature: s.clone(), ..base.clone() };
        json!({
            "name": name,
            "chain_id": chain,
            "signature": format!("0x{}", hex::encode(s)),
            "recovered": recover_sender(&domain(*chain), &op).map(|a| a.to_string()),
        })
    }).collect::<Vec<_>>();

    // ── Differential decode vectors ──
    let small = Batch {
        nonce: 9,
        frames: vec![
            Frame { user_ops: vec![WireUserOp { nonce: 1, max_fee: 2, data: vec![0xd1, 0xd2], signature: vec![0x51, 0x52, 0x53] }], safe_block: 4, fee_price: 3 },
            Frame { user_ops: vec![
                WireUserOp { nonce: 5, max_fee: 6, data: vec![], signature: vec![0x61] },
                WireUserOp { nonce: 7, max_fee: 8, data: vec![0x71], signature: vec![] },
            ], safe_block: 10, fee_price: 11 },
        ],
    }.as_ssz_bytes();
    let mut adversarial = vec![];
    for cut in 0..small.len() {
        adversarial.push(verdict(&small[..cut]));
    }
    for i in 0..small.len() {
        let mut m = small.clone();
        m[i] ^= 0x01;
        adversarial.push(verdict(&m));
        // Offsets are little-endian and small, so setting one byte to a value
        // near a fixed-portion size or a field boundary reaches every offset
        // rule: into the fixed portion, past the end, decreasing, unaligned.
        for x in [0x00u8, 0x05, 0x0c, 0x0d, 0x0e, 0x0f, 0xff] {
            if small[i] != x {
                let mut m = small.clone();
                m[i] = x;
                adversarial.push(verdict(&m));
            }
        }
    }
    for tail in [vec![0u8], vec![0xff; 3], vec![0; 4], vec![0x0c, 0, 0, 0]] {
        adversarial.push(verdict(&[small.clone(), tail].concat()));
    }
    let mut seed: u64 = 0x9e3779b97f4a7c15;
    let mut next = || { seed ^= seed << 13; seed ^= seed >> 7; seed ^= seed << 17; seed };
    for _ in 0..200 {
        let len = (next() % 96) as usize;
        let mut buf: Vec<u8> = (0..len).map(|_| {
            // Bias toward small values so offsets are plausible.
            let r = next();
            if r % 3 == 0 { (r >> 8) as u8 } else { ((r >> 8) % 24) as u8 }
        }).collect();
        if buf.len() >= 12 && next() % 2 == 0 { buf[8..12].copy_from_slice(&12u32.to_le_bytes()); }
        adversarial.push(verdict(&buf));
    }
    for pattern in [0x00u8, 0x01, 0x42, 0x7f, 0x80, 0xff] {
        for len in [1usize, 12, 13, 16, 64, 256] {
            adversarial.push(verdict(&vec![pattern; len]));
        }
    }

    // ── Fee table ──
    let mut exps: Vec<u16> = (0..=20).collect();
    exps.extend([63, 64, 127, 128, 129, 255, 256, 511, 512, 1000, 1024, 2048, 4096, 8191, 8192, 10000, 16384, 20000]);
    exps.extend([MAX_EXPONENT - 1, MAX_EXPONENT]);
    exps.retain(|e| *e <= MAX_EXPONENT);
    let fees = exps.iter().map(|e| json!([e, fee_to_linear(*e).to_string()])).collect::<Vec<_>>();

    let out = json!({
        "generator": "apps/explorer/scripts/fixturegen",
        "application": APP.to_string(),
        "chain_id": CHAIN,
        "signers": signers,
        "valid": valid,
        "mixed_senders": senders,
        "signature_cases": signature_cases,
        "adversarial": adversarial,
        "fee": { "max_exponent": MAX_EXPONENT, "vectors": fees },
    });
    println!("{}", serde_json::to_string_pretty(&out).unwrap());
}
