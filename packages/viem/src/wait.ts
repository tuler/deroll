export const wait = async (time: number) =>
    new Promise((res) => setTimeout(res, time));
