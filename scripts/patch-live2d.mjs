// Local lifecycle fix for the pinned easy-live2d 0.4.4 distribution.
// Original source: https://registry.npmjs.org/easy-live2d/-/easy-live2d-0.4.4.tgz
// See THIRD_PARTY_NOTICES.md. This patch is applied to the source at build time;
// node_modules is never modified. A changed upstream shape fails the build.
export function patchLive2D(source) {
  const replace = (before, after) => {
    if (source.split(before).length !== 2) throw new Error('easy-live2d 0.4.4 lifecycle patch no longer matches the pinned source');
    source = source.replace(before, after);
  };
  replace('var Live2DSprite = class extends Sprite {', 'let dphCubismOwners = 0;\nvar Live2DSprite = class extends Sprite {');
  replace(`  initCubism() {
    const option = new Option();`, `  initCubism() {
    if (this._cubismInitialized) return;
    const option = new Option();`);
  replace(`    CubismFramework.initialize();
    this._cubismInitialized = true;`, `    CubismFramework.initialize();
    dphCubismOwners++;
    this._cubismInitialized = true;`);
  replace(`  setGlContext(gl) {
    if (!this._shaderMap.isExist(gl)) {`, `  releaseGlContext(gl) {
    for (let it = this._shaderMap.begin(); it.notEqual(this._shaderMap.end()); it.preIncrement()) {
      if (it.ptr().first === gl) {
        it.ptr().second.release();
        this._shaderMap.erase(it);
        break;
      }
    }
  }
  setGlContext(gl) {
    if (!this._shaderMap.isExist(gl)) {`);
  replace(`  destroy(options) {
    this._pointerHandler?.detach();
    this._resizeObserver?.disconnect();
    this._textureLoader?.release();
    this._model = null;
    this._ctx.dispose();
    if (this._cubismInitialized) {
      CubismFramework.dispose();
      this._cubismInitialized = false;
    }
    super.destroy(options);
  }`, `  destroy(options) {
    if (this.destroyed) return;
    this._pointerHandler?.detach();
    this._resizeObserver?.disconnect();
    const gl = this._ctx.webgl.getGl();
    this._model?.effectCtrl?.stopVoice();
    this._model?.release();
    this._model = null;
    this._textureLoader?.release();
    if (gl && this._cubismInitialized) CubismShaderManager_WebGL.getInstance().releaseGlContext(gl);
    this._ctx.dispose();
    if (this._cubismInitialized) {
      this._cubismInitialized = false;
      if (--dphCubismOwners === 0) CubismFramework.dispose();
    }
    super.destroy(options);
  }`);
  return source;
}
