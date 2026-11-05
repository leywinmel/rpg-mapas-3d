/**
 * Materiais de terceiros que vão no site. CC0 não exige crédito: citamos por cortesia.
 * Ao incluir um pacote com licença que exige atribuição (ex: CC BY), ele entra aqui antes de
 * ir ao ar.
 */
export type Credit = {
  work: string;
  author: string;
  license: string;
  licenseUrl: string;
  url: string;
  usage: string;
};

const CC0 = {
  license: 'CC0 1.0 (domínio público)',
  licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
};

export const MODEL_CREDITS: readonly Credit[] = [
  {
    work: 'Medieval Village MegaKit',
    author: 'Quaternius',
    url: 'https://quaternius.com',
    usage: 'Peças do estilo medieval: pisos, paredes, telhados, escadas, carroça e adereços.',
    ...CC0,
  },
  {
    work: 'Downtown City MegaKit',
    author: 'Quaternius',
    url: 'https://quaternius.com',
    usage: 'Peças do estilo moderno: calçadas, ruas, fachadas, vitrines e mobiliário urbano.',
    ...CC0,
  },
  {
    work: 'Modular Sci-Fi MegaKit',
    author: 'Quaternius',
    url: 'https://quaternius.com',
    usage: 'Peças do estilo futurista: pisos de metal, painéis, portais, terminais e carga.',
    ...CC0,
  },
  {
    work: 'Car Kit',
    author: 'Kenney',
    url: 'https://kenney.nl/assets/car-kit',
    usage: 'Carros, caminhões, tratores, veículos de serviço, o carro futurista e os karts.',
    ...CC0,
  },
];

export const FONT_CREDITS: readonly Credit[] = [
  {
    work: 'Inter',
    author: 'Rasmus Andersson',
    url: 'https://rsms.me/inter/',
    license: 'SIL Open Font License 1.1',
    licenseUrl: 'https://openfontlicense.org',
    usage: 'Fonte da interface e dos números dos dados.',
  },
];
