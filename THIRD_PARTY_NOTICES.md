# Third-party notices

The host adapter reuses the web rendering approach and adapts parameter mapping,
resource composition, and sizing from ayangweb/BongoCat, pre-refactor-tauri:
https://github.com/ayangweb/BongoCat/tree/pre-refactor-tauri
Original files: src/utils/live2d.ts, src/composables/useModel.ts,
src/composables/useDevice.ts, src/pages/main/index.vue.
Original Tauri filesystem/window ownership and Vue state are replaced by
browser Blob IO, IndexedDB, and the DSH React slot lifecycle.

Original BongoCat branch license:

MIT License

Copyright (c) 2025 ayangweb

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

## Bundled runtime libraries

The build includes easy-live2d 0.4.4, Pixi.js 8.18.1, fflate 0.8.2, JSON5 2.2.3
and their bundled dependencies. easy-live2d receives a local lifecycle fix,
described below; other dependencies are unmodified. Each package's supplied license is
copied to lib/licenses; inventory.json records the exact versions and original
source tarball URLs. easy-live2d 0.4.4's package metadata declares MPL-2.0 while
its distributed LICENSE contains MIT text; both the metadata and license file
are preserved in that inventory. Original easy-live2d source distribution:
https://registry.npmjs.org/easy-live2d/-/easy-live2d-0.4.4.tgz

easy-live2d includes Live2D Cubism Framework source:
Copyright(c) Live2D Inc. All rights reserved.
Use is governed by the Live2D Open Software license:
https://www.live2d.com/eula/live2d-open-software-license-agreement_en.html

React is provided by DSH and is not bundled into the plugin client.

Live2D Cubism Core and character/model artwork are NOT distributed in this
plugin or source archive. Import them locally under their respective terms.
The upstream BongoCat model and Core used for local verification are excluded
from all delivered archives. The optional whale bridge reads existing routes;
no whale code, character artwork, audio, credentials, or accounting data is copied.

## easy-live2d local lifecycle patch (0.1.1)

`scripts/patch-live2d.mjs` applies a narrow, fail-closed build-time patch to
easy-live2d 0.4.4: reference-count Cubism owners, release a disposed model's
native memory and GL-context shader resources, and defer global framework
disposal until the last owner exits. This prevents replacing one Live2D model
from invalidating the newly prepared model. Original source is linked above;
the complete transformation is available in this repository:
https://github.com/Zimeng-Luo/dsh-pet-hub/blob/main/scripts/patch-live2d.mjs

Mver layout and VK binding interpretation in src/adapters/mver.js is a new
JavaScript implementation of the config/resource format. No Mver executable
is invoked or redistributed by the installer. User model resources remain
local imports and are excluded from the installer.
