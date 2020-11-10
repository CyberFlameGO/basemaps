# @basemaps/attribution

This Library is for use with the [LINZ basemaps](https://github.com/linz/basemaps) product. It determines the applicable attribution for the tiles within a given extent and zoom level.

## Usage

```bash
npm install @basemaps/attribution
```

```js
import { Attribution } from '@basemaps/attribution';

const attributions = new Attribution('EPSG:3857');
await attributions.load(attrURL);

const attrList = attributions.filter([19455725.1, -5053732.8, 19456330.7, -5053278.8], 17)));
const description = attributions.renderList(attrList);
```

Using this from a CDN: see the attribution example at https://basemaps.linz.govt.nz/examples

## License

This system is licensed under the MIT License, except where otherwise specified. See the [LICENSE](https://github.com/linz/basemaps/blob/master/LICENSE) file for more details.
