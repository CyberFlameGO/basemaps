import { MosaicCog } from '../../tiff.mosaic';
import { EPSG } from '@basemaps/geo';

MosaicCog.create({
    id: '01DZJ6K7H3F8EQ9CC5VZXJY80N',
    name: 'dunedin_urban_2018-19_0.1m',
    projection: EPSG.Wgs84,
    minZoom: 14,
    priority: 150,
    year: 2018,
    resolution: 100,
    quadKeys: [
        '31311201221',
        '313112012101',
        '313112012121',
        '313112012123',
        '313112012132',
        '313112012200',
        '313112012202',
        '313112012203',
        '313112012300',
        '313112012301',
        '3131120013312',
        '3131120013313',
        '3131120033132',
        '3131120100230',
        '3131120100232',
        '3131120103233',
        '3131120103322',
        '3131120120333',
        '3131120121023',
        '3131120121030',
        '3131120121031',
        '3131120121032',
        '3131120121100',
        '3131120121102',
        '3131120121201',
        '3131120121203',
        '3131120121221',
        '3131120121222',
        '3131120121223',
        '3131120121302',
        '3131120121303',
        '3131120122010',
        '3131120122011',
        '3131120122013',
        '3131120122200',
        '3131120122201',
        '3131120122210',
        '3131120122211',
        '3131120122220',
        '3131120122221',
        '3131120122300',
        '3131120123020',
        '3131120123021',
    ],
});
