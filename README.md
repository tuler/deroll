# deroll

Deroll is a TypeScript framework for developing [Cartesi](https://cartesi.io) applications.
The code below is a minimal application which just loops forever fetching inputs, but with no input handlers. In that case any input is `rejected`.

```typescript
import { createApp } from "@deroll/app";

const app = createApp({ url: "http://127.0.0.1:5004" });
// TODO: add input handlers here
app.start().catch((e) => process.exit(1));
```

## License

This code is licensed under the [MIT License](./LICENSE).
