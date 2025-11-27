// Manual mock for gifski-wasm so both default and named exports exist
const encodeMock = jest.fn().mockResolvedValue(
  new Uint8Array([
    0x47, 0x49, 0x46, 0x38, 0x39, 0x61, // GIF89a header
    0x0A, 0x00, 0x0A, 0x00, // Width/height
    0xF0, 0x00, 0x00, // Global color table flag
  ])
);

const initMock = jest.fn().mockResolvedValue(undefined);

module.exports = {
  __esModule: true,
  default: encodeMock,
  encode: encodeMock,
  init: initMock,
};
