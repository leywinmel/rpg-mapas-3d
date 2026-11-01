import { describe, expect, it } from 'vitest';
import {
  assetNameFromFile,
  checkGlbFile,
  GLB_MAGIC,
  MAX_ASSET_NAME_LENGTH,
  MAX_GLB_BYTES,
  validateGlb,
} from './glb-validation';

const GLB_HEADER = new Uint8Array([...GLB_MAGIC, 2, 0, 0, 0]);
const JSON_HEADER = new TextEncoder().encode('{"as');

describe('glb-validation', () => {
  it('shouldAcceptABinaryGltfWithinTheLimit', () => {
    expect(validateGlb({ name: 'Estátua.GLB', size: MAX_GLB_BYTES }, GLB_HEADER)).toEqual({
      ok: true,
    });
  });

  it('shouldRefuseOtherExtensionsEvenWithTheRightContent', () => {
    const result = validateGlb({ name: 'modelo.gltf', size: 100 }, GLB_HEADER);
    expect(result).toEqual({ ok: false, message: expect.stringMatching(/\.glb/) });
  });

  it('shouldRefuseEmptyAndOversizedFiles', () => {
    expect(validateGlb({ name: 'a.glb', size: 0 }, GLB_HEADER).ok).toBe(false);
    const big = validateGlb({ name: 'a.glb', size: MAX_GLB_BYTES + 1 }, GLB_HEADER);
    expect(big).toEqual({ ok: false, message: expect.stringMatching(/10 MB/) });
  });

  it('shouldRefuseARenamedFileWithoutTheGltfSignature', () => {
    const result = validateGlb({ name: 'foto.glb', size: 100 }, JSON_HEADER);
    expect(result).toEqual({ ok: false, message: expect.stringMatching(/não é um \.glb/) });
  });

  it('shouldReadTheHeaderFromTheFile', async () => {
    const good = new File([GLB_HEADER], 'ok.glb');
    const fake = new File(['nao sou glb'], 'fake.glb');
    expect(await checkGlbFile(good)).toEqual({ ok: true });
    expect((await checkGlbFile(fake)).ok).toBe(false);
  });

  it('shouldNameTheAssetAfterTheFile', () => {
    expect(assetNameFromFile('Dragão Vermelho.glb')).toBe('Dragão Vermelho');
    expect(assetNameFromFile('x'.repeat(200) + '.glb')).toHaveLength(MAX_ASSET_NAME_LENGTH);
  });
});
