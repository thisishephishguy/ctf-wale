/**
 * Comprehensive Categories, Words, Hints, and True Randomization Engine
 * 5 Categories x 20 Unique Words = 100 Total Words with Individual Hints
 */

export const CATEGORIES = {
  countries: {
    words: [
      'russia', 'india', 'brazil', 'japan', 'china',
      'france', 'egypt', 'canada', 'germany', 'italy',
      'spain', 'mexico', 'turkey', 'greece', 'norway',
      'sweden', 'switzerland', 'australia', 'argentina', 'kenya'
    ],
    hints: {
      russia: 'Largest country in the world by land area',
      india: 'Country famous for the Taj Mahal and vibrant spices',
      brazil: 'Largest country in South America, famous for football and the Amazon',
      japan: 'Island nation in East Asia known for sushi and the rising sun',
      china: 'Home to the Great Wall and the historic Silk Road',
      france: 'Western European country famous for the Eiffel Tower and fine wine',
      egypt: 'North African country known for the Nile and ancient pyramids',
      canada: 'Second largest country by area, renowned for maple syrup',
      germany: 'European nation famous for precision engineering and Oktoberfest',
      italy: 'Boot-shaped Mediterranean nation, birthplace of pizza and the Renaissance',
      spain: 'Iberian nation famous for flamenco dance and historic plazas',
      mexico: 'North American nation famous for tacos, Mayan ruins, and mariachi',
      turkey: 'Country straddling Europe and Asia across the Bosphorus Strait',
      greece: 'Cradle of Western democracy, philosophy, and the ancient Olympic games',
      norway: 'Scandinavian country famous for deep coastal fjords and northern lights',
      sweden: 'Nordic nation known for Nobel prizes and vast pine forests',
      switzerland: 'Alpine nation famous for neutrality, fine watches, and chocolate',
      australia: 'Island continent known for the rugged Outback and coral reefs',
      argentina: 'South American nation famous for tango dance and the Pampas',
      kenya: 'East African nation famous for the Great Rift Valley and wildlife safaris'
    }
  },

  animals: {
    words: [
      'tiger', 'lion', 'elephant', 'shark', 'wolf',
      'bear', 'dolphin', 'snake', 'monkey', 'leopard',
      'cheetah', 'panther', 'zebra', 'giraffe', 'rhino',
      'hippo', 'kangaroo', 'gorilla', 'panda', 'otter'
    ],
    hints: {
      tiger: 'Largest wild cat species, marked by orange fur with dark stripes',
      lion: 'Majestic apex predator known as the king of the beasts',
      elephant: 'Largest living terrestrial animal with a long prehensile trunk',
      shark: 'Ancient ocean predator with a cartilaginous skeleton and sharp teeth',
      wolf: 'Wild pack-hunting canine that communicates with haunting night howls',
      bear: 'Heavy mammal with thick fur that typically hibernates in winter',
      dolphin: 'Highly intelligent marine mammal that communicates using sonar clicks',
      snake: 'Legless elongated carnivorous reptile that sheds its scaly skin',
      monkey: 'Arboreal primate with forward-facing eyes and agile limbs',
      leopard: 'Spotted big cat known for dragging heavy prey up into trees',
      cheetah: 'Fastest land animal on Earth, built with sleek aerodynamic speed',
      panther: 'Melanistic dark-furred stealth predator of deep rainforests',
      zebra: 'African wild equine recognized by distinctive black and white stripes',
      giraffe: 'Tallest living terrestrial animal with an exceptionally long neck',
      rhino: 'Large thick-skinned herbivore equipped with sturdy keratin horns',
      hippo: 'Massive semi-aquatic African mammal that spends days submerged in rivers',
      kangaroo: 'Australian marsupial that hops on powerful hind legs with a front pouch',
      gorilla: 'Largest living primate, highly intelligent and native to Central Africa',
      panda: 'Black-and-white bear native to China with a diet almost entirely of bamboo',
      otter: 'Playful semi-aquatic mammal with dense water-repellent fur'
    }
  },

  fruits: {
    words: [
      'mango', 'apple', 'banana', 'orange', 'grape',
      'lemon', 'cherry', 'peach', 'melon', 'guava',
      'papaya', 'kiwi', 'berry', 'plum', 'apricot',
      'fig', 'olive', 'coconut', 'pineapple', 'watermelon'
    ],
    hints: {
      mango: 'Sweet tropical stone fruit acclaimed as the king of fruits',
      apple: 'Crisp orchard fruit that inspired Isaac Newton and a major tech brand',
      banana: 'Curved yellow tropical fruit packed with potassium',
      orange: 'Juicy citrus fruit that shares its name with a vibrant primary colour',
      grape: 'Small round clustered berry cultivated globally to produce wine',
      lemon: 'Bright yellow citrus fruit known for its sharp acidic sour taste',
      cherry: 'Small round ruby-red stone fruit frequently crowning dessert sundaes',
      peach: 'Velvety fuzzy-skinned stone fruit with sweet pinkish-orange flesh',
      melon: 'Large sweet gourd fruit with refreshing juicy flesh',
      guava: 'Tropical fruit with fragrant pink or white flesh and tiny hard seeds',
      papaya: 'Tropical fruit with vibrant orange flesh and peppery black seeds',
      kiwi: 'Small brown fuzzy egg-shaped fruit with bright emerald-green flesh',
      berry: 'Small pulpy edible fruit often found on bushes and hedgerows',
      plum: 'Smooth-skinned purple or reddish stone fruit dried into prunes',
      apricot: 'Small golden-orange stone fruit resembling a miniature peach',
      fig: 'Tear-shaped ancient fruit with chewy flesh filled with crunchy seeds',
      olive: 'Small oval fruit grown on Mediterranean groves, pressed for oil',
      coconut: 'Large fibrous palm seed containing refreshing water and rich white meat',
      pineapple: 'Tropical fruit with spiky crown and golden sweet-tart interior',
      watermelon: 'Massive green-rind melon consisting of over ninety percent water'
    }
  },

  birds: {
    words: [
      'pigeon', 'parrot', 'eagle', 'peacock', 'crow',
      'owl', 'sparrow', 'penguin', 'swan', 'hawk',
      'falcon', 'flamingo', 'seagull', 'woodpecker', 'hummingbird',
      'pelican', 'crane', 'raven', 'canary', 'ostrich'
    ],
    hints: {
      pigeon: 'Ubiquitous urban bird historic for carrying wartime messages across lines',
      parrot: 'Vibrantly colored tropical bird renowned for mimicking vocal sounds',
      eagle: 'Iconic apex bird of prey with razor-sharp vision and hooked beak',
      peacock: 'Spectacular bird celebrated for dazzling iridescent eye-spotted tail plumes',
      crow: 'Extremely intelligent jet-black corvid found across global cities',
      owl: 'Nocturnal raptor with silent flight feathers and large forward-facing eyes',
      sparrow: 'Small brown songbird nesting under rooftops and eaves worldwide',
      penguin: 'Flightless aquatic bird adapted for extreme cold in the Southern Hemisphere',
      swan: 'Graceful long-necked white waterfowl that mates for life',
      hawk: 'Fierce diurnal raptor that dives at rapid speeds upon unsuspecting prey',
      falcon: 'High-velocity raptor capable of diving exceeds two hundred miles per hour',
      flamingo: 'Tall wading bird famous for standing on one leg with bright pink plumage',
      seagull: 'Grey-and-white coastal bird known for shrill calls and scavenger habits',
      woodpecker: 'Tree-dwelling bird with chisel bill that hammers bark for insects',
      hummingbird: 'Tiny iridescent bird that hovers mid-air by beating wings up to eighty times a second',
      pelican: 'Large water bird with an enormous throat pouch for scooping up fish',
      crane: 'Tall stately wading bird celebrated in origami for thousand-year longevity',
      raven: 'Large glossy black corvid featured in folklore and Gothic poetry',
      canary: 'Small yellow songbird once used to detect dangerous gases in deep coal mines',
      ostrich: 'Largest and heaviest living bird, capable of sprinting over forty miles per hour'
    }
  },

  capitals: {
    words: [
      'tokyo', 'paris', 'delhi', 'cairo', 'london',
      'rome', 'berlin', 'moscow', 'beijing', 'seoul',
      'madrid', 'ottawa', 'canberra', 'bangkok', 'hanoi',
      'jakarta', 'brasilia', 'athens', 'oslo', 'dublin'
    ],
    hints: {
      tokyo: 'Metropolitan capital of Japan, the most populous urban center on Earth',
      paris: 'Capital of France, heralded as the City of Light along the River Seine',
      delhi: 'Historic capital of India, site of the iconic Red Fort and India Gate',
      cairo: 'Historic capital of Egypt, gateway to the ancient Pyramids of Giza',
      london: 'Capital of the United Kingdom, famous for Big Ben and the River Thames',
      rome: 'Capital of Italy, the Eternal City home to the ancient Colosseum',
      berlin: 'Capital of Germany, once separated by a historic concrete wall',
      moscow: 'Capital of Russia, known for the Red Square and Saint Basil Cathedral',
      beijing: 'Capital of China, historical seat of power and the Forbidden City',
      seoul: 'Capital of South Korea, vibrant high-tech metropolis along the Han River',
      madrid: 'Capital of Spain, famous for grand royal palaces and the Prado Museum',
      ottawa: 'Capital of Canada, situated along the Ottawa River with Parliament Hill',
      canberra: 'Planned inland bush capital of Australia between Sydney and Melbourne',
      bangkok: 'Vibrant capital of Thailand, famous for ornate shrines and bustling river life',
      hanoi: 'Ancient capital of Vietnam, known for centuries-old architecture and lakes',
      jakarta: 'Sprawling island capital of Indonesia on the northwest coast of Java',
      brasilia: 'Futuristic airplane-shaped planned capital of Brazil founded in 1960',
      athens: 'Ancient capital of Greece, crowned by the hilltop Parthenon temple',
      oslo: 'Capital of Norway, situated at the head of the Oslofjord amidst green hills',
      dublin: 'Capital of Ireland, famous for Trinity College and historic Georgian architecture'
    }
  }
};

export const SPECIAL_CHARS = ['$', '#', '@', '!', '&', '*'];

/**
 * True cryptographically secure random integer between 0 and max - 1
 */
export function getRandomInt(max) {
  if (max <= 0) return 0;
  if (typeof globalThis !== 'undefined' && globalThis.crypto && typeof globalThis.crypto.getRandomValues === 'function') {
    const buf = new Uint32Array(1);
    globalThis.crypto.getRandomValues(buf);
    return buf[0] % max;
  }
  return Math.floor(Math.random() * max);
}

/**
 * Pick random element using CSPRNG
 */
export function getRandomElement(arr) {
  if (!arr || arr.length === 0) return null;
  return arr[getRandomInt(arr.length)];
}

/**
 * Flattened list of all 100 available words
 */
export function getAllWords() {
  return Object.values(CATEGORIES).flatMap(c => c.words);
}

/**
 * Lookup hint for any word across all categories
 */
export function getWordHint(word) {
  if (!word) return null;
  const cleanWord = String(word).trim().toLowerCase();
  for (const [catName, catData] of Object.entries(CATEGORIES)) {
    if (catData.hints[cleanWord]) {
      return catData.hints[cleanWord];
    }
  }
  return null;
}

/**
 * Lookup category name for any word
 */
export function getWordCategory(word) {
  if (!word) return null;
  const cleanWord = String(word).trim().toLowerCase();
  for (const [catName, catData] of Object.entries(CATEGORIES)) {
    if (catData.words.includes(cleanWord)) {
      return catName;
    }
  }
  return null;
}

/**
 * Generate a single team's credentials with optional category/word exclusion
 */
export function generateSingleCredentials(excludedCategories = [], excludedWords = []) {
  const allCatKeys = Object.keys(CATEGORIES);
  const availableCats = allCatKeys.filter(c => !excludedCategories.includes(c));
  const chosenCatKey = availableCats.length > 0
    ? getRandomElement(availableCats)
    : getRandomElement(allCatKeys);

  const catData = CATEGORIES[chosenCatKey];
  const availableWords = catData.words.filter(w => !excludedWords.includes(w));
  const chosenWord = availableWords.length > 0
    ? getRandomElement(availableWords)
    : getRandomElement(catData.words);

  const hint = catData.hints[chosenWord] || `The password word belongs to the category: ${chosenCatKey.toUpperCase()}`;
  const digit = getRandomInt(10); // 0-9
  const special = getRandomElement(SPECIAL_CHARS);

  return {
    word: chosenWord,
    category: chosenCatKey,
    digit,
    special,
    hint,
    password: `${chosenWord}${digit}${special}`
  };
}

/**
 * Generate credentials for both Team A and Team B in a pairing,
 * guaranteeing distinct categories and completely different words!
 */
export function generatePairingCredentials() {
  // Team A gets a random category & word
  const credA = generateSingleCredentials();

  // Team B gets a DIFFERENT category and DIFFERENT word
  const credB = generateSingleCredentials([credA.category], [credA.word]);

  return { credA, credB };
}

export default CATEGORIES;
