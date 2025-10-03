import React, { useState, useEffect } from "react";
import { getImageUrl } from "../utils/imageUtils";

// Curated 50 image URLs from database - mix of animals, birds, fruits, vegetables, flowers
const CURATED_IMAGES = [
  // Animals (10)
  "/categories/animals/A/alligator/medium/alligator_pixabay_7823344_1754673102395_medium.webp",
  "/categories/animals/B/bear/medium/bear_unsplash_r6w0r6sueq_1754816282067_medium.webp",
  "/categories/animals/C/cat/medium/cat_unsplash_7aide8prva0_1754678042068_medium.webp",
  "/categories/animals/D/dog/medium/dog_unsplash_qo_pif84vxg_1754678427167_medium.webp",
  "/categories/animals/E/eagle/medium/eagle_pixabay_341898_1754920795998_medium.webp",
  "/categories/animals/F/ferret/medium/ferret_pixabay_1120508_1754838729423_medium.webp",
  "/categories/animals/G/giraffe/medium/giraffe_unsplash_nvxy8_m1n40_1754838879080_medium.webp",
  "/categories/animals/H/hamster/medium/hamster_pixabay_3161014_1754839157275_medium.webp",
  "/categories/animals/I/ibex/medium/ibex_unsplash_lac_uf7koa0_1754921083239_medium.webp",
  "/categories/animals/J/jackal/medium/jackal_pixabay_342021_1754904283895_medium.webp",

  // Birds (10)
  "/categories/birds/A/accentor/medium/accentor_pixabay_8910016_1754905940305_medium.webp",
  "/categories/birds/B/bittern/medium/bittern_unsplash_75lgd5mmf_w_1754925768856_medium.webp",
  "/categories/birds/C/canary/medium/canary_unsplash_q77k0zidtmi_1754925790032_medium.webp",
  "/categories/birds/D/dodo/medium/dodo_pixabay_5201240_1754928893321_medium.webp",
  "/categories/birds/E/eagle/medium/eagle_unsplash_eaj1l4zjrb4_1754925815751_medium.webp",
  "/categories/birds/F/falcon/medium/falcon_unsplash_b925owk9cxw_1754925829572_medium.webp",
  "/categories/birds/G/gannet/medium/gannet_unsplash_q_5tgrxrubo_1754925847337_medium.webp",
  "/categories/birds/H/harrier/medium/harrier_unsplash_mpbqbbjy1fu_1754925862121_medium.webp",
  "/categories/birds/I/ibis/medium/ibis_pexels_1242673_1754929848311_medium.webp",
  "/categories/birds/J/jabiru/medium/jabiru_unsplash_k3ldyp_wl_k_1754925892643_medium.webp",

  // Fruits (10)
  "/categories/fruits/A/apple/medium/apple_pexels_1131079_1754974579266_medium.webp",
  "/categories/fruits/B/banana/medium/banana_unsplash_dktugvgpota_1754841776813_medium.webp",
  "/categories/fruits/C/cantaloupe/medium/cantaloupe_unsplash_piybw7_fg1u_1754841788166_medium.webp",
  "/categories/fruits/D/damson/medium/damson_pixabay_4393618_1754841799000_medium.webp",
  "/categories/fruits/F/fairchild_tangerine/medium/fairchild_tangerine_pixabay_850432_1754841806853_medium.webp",
  "/categories/fruits/G/goji_berry/medium/goji_berry_pixabay_7602422_1754989269722_medium.webp",
  "/categories/fruits/H/hackberry/medium/hackberry_pixabay_938223_1754989353172_medium.webp",
  "/categories/fruits/I/italian_plum/medium/italian_plum_unsplash_h0iy1uupy0i_1754989780071_medium.webp",
  "/categories/fruits/J/jabuticaba/medium/jabuticaba_pixabay_834458_1754841825319_medium.webp",
  "/categories/fruits/K/kaffir_lime/medium/kaffir_lime_pixabay_1554220_1754990747051_medium.webp",

  // Vegetables (10)
  "/categories/vegetables/A/amaranth/medium/amaranth_pexels_32286724_1755010535006_medium.webp",
  "/categories/vegetables/B/beet/medium/beet_unsplash_eogjaog7h0_1755007985639_medium.webp",
  "/categories/vegetables/C/cabbage/medium/cabbage_unsplash_ujh4hu9s_ka_1755008014749_medium.webp",
  "/categories/vegetables/D/daikon/medium/daikon_pixabay_3936797_1755010728382_medium.webp",
  "/categories/vegetables/E/edamame/medium/edamame_pixabay_1762480_1755011098849_medium.webp",
  "/categories/vegetables/F/fava_bean/medium/fava_bean_pixabay_9400499_1755011347734_medium.webp",
  "/categories/vegetables/G/garlic/medium/garlic_unsplash_qowydpkhaci_1755008091773_medium.webp",
  "/categories/vegetables/H/habanero/medium/habanero_unsplash_hkl8ggz75ja_1755008116436_medium.webp",
  "/categories/vegetables/I/iceberg_lettuce/medium/iceberg_lettuce_unsplash_ylerhrirgts_1755012059634_medium.webp",
  "/categories/vegetables/J/jade_plant/medium/jade_plant_pixabay_1633676_1755012438730_medium.webp",

  // Flowers (10)
  "/categories/flowers/A/amaryllis/medium/amaryllis_unsplash_ljopnealj48_1755096691987_medium.webp",
  "/categories/flowers/B/baby_s_breath/medium/baby_s_breath_unsplash_xe7_vedzokw_1755097216419_medium.webp",
  "/categories/flowers/C/calla_lily/medium/calla_lily_unsplash_bc7awgap_yg_1755097622851_medium.webp",
  "/categories/flowers/D/dahlia/medium/dahlia_unsplash_yu326pwy9i0_1755097842607_medium.webp",
  "/categories/flowers/E/easter_lily/medium/easter_lily_pixabay_7873895_1755098014334_medium.webp",
  "/categories/flowers/F/forget_me_not/medium/forget_me_not_pexels_206837_1755098334228_medium.webp",
  "/categories/flowers/G/gardenia/medium/gardenia_pixabay_5097886_1755098594683_medium.webp",
  "/categories/flowers/H/heather/medium/heather_pixabay_6995787_1755098798940_medium.webp",
  "/categories/flowers/I/iceland_poppy/medium/iceland_poppy_pixabay_7040946_1755098975533_medium.webp",
  "/categories/flowers/J/jack_in_the_pulpit/medium/jack_in_the_pulpit_pixabay_907415_1755099288299_medium.webp",

  // More Animals (20)
  "/categories/animals/G/goat/medium/goat_pixabay_2052731_1754838970156_medium.webp",
  "/categories/animals/H/hawk/medium/hawk_unsplash_onpxyxjwkm0_1754921004659_medium.webp",
  "/categories/animals/I/ibis/medium/ibis_unsplash_3pz9hitilzm_1754921024569_medium.webp",
  "/categories/animals/J/jackrabbit/medium/jackrabbit_pixabay_2222984_1754904334362_medium.webp",
  "/categories/animals/K/kangaroo/medium/kangaroo_unsplash_qnfvtob4hhe_1754904363554_medium.webp",
  "/categories/animals/K/killer_whale/medium/killer_whale_pexels_5045962_1754904441281_medium.webp",
  "/categories/animals/L/leopard/medium/leopard_pixabay_515509_1754904535624_medium.webp",
  "/categories/animals/L/lion/medium/lion_unsplash_uxhol6swlym_1754904473763_medium.webp",
  "/categories/animals/M/mantis/medium/mantis_unsplash_0nj0ulbdtfs_1754904672801_medium.webp",
  "/categories/animals/M/monkey/medium/monkey_unsplash_wmlt_iyz1e8_1754904576751_medium.webp",
  "/categories/animals/N/narwhal/medium/narwhal_unsplash_wajmwvkb7eq_1754903256696_medium.webp",
  "/categories/animals/N/newt/medium/newt_unsplash_ljf0c14e1mq_1754923581923_medium.webp",
  "/categories/animals/O/ocelot/medium/ocelot_unsplash_hh0gvfqyvdg_1754904822974_medium.webp",
  "/categories/animals/O/octopus/medium/octopus_unsplash_igomdftkf_u_1754904725854_medium.webp",
  "/categories/animals/P/panda/medium/panda_unsplash_gchfd7t1jsa_1754904900928_medium.webp",
  "/categories/animals/P/penguin/medium/penguin_unsplash_kfjjwaqjbea_1754904851669_medium.webp",
  "/categories/animals/Q/quail/medium/quail_pixabay_7839962_1754904928879_medium.webp",
  "/categories/animals/R/raccoon/medium/raccoon_unsplash_jbv_wppugbk_1754904959803_medium.webp",
  "/categories/animals/S/seal/medium/seal_pixabay_5071136_1754905088652_medium.webp",
  "/categories/animals/T/tiger/medium/tiger_unsplash_g1h-jxw-p-8_1754905053754_medium.webp",

  // More Birds (20)
  "/categories/birds/F/finch/medium/finch_unsplash_w1pliq6z94_1754925832821_medium.webp",
  "/categories/birds/G/goldfinch/medium/goldfinch_pixabay_7621287_1754938794190_medium.webp",
  "/categories/birds/H/hawk/medium/hawk_unsplash_fmcouaj1qhk_1754925865327_medium.webp",
  "/categories/birds/I/inca_tern/medium/inca_tern_unsplash_qn5dpnlux8k_1754925880374_medium.webp",
  "/categories/birds/J/jackdaw/medium/jackdaw_unsplash_m5umzo65j6o_1754925896137_medium.webp",
  "/categories/birds/K/kestrel/medium/kestrel_unsplash_hsxpfq5lkhc_1754925904539_medium.webp",
  "/categories/birds/K/killdeer/medium/killdeer_pexels_31825923_1754929769639_medium.webp",
  "/categories/birds/L/lapwing/medium/lapwing_pixabay_7434650_1754896894504_medium.webp",
  "/categories/birds/L/lark/medium/lark_pixabay_5177165_1754929964995_medium.webp",
  "/categories/birds/M/magpie/medium/magpie_pixabay_7811413_1754896904693_medium.webp",
  "/categories/birds/M/mallard/medium/mallard_pixabay_2144523_1754896907817_medium.webp",
  "/categories/birds/N/nene/medium/nene_pixabay_5182862_1754896917329_medium.webp",
  "/categories/birds/N/nightingale/medium/nightingale_pixabay_3479373_1754896920934_medium.webp",
  "/categories/birds/O/oriole/medium/oriole_pixabay_7534030_1754896926939_medium.webp",
  "/categories/birds/O/osprey/medium/osprey_pixabay_5723920_1754896930368_medium.webp",
  "/categories/birds/P/parrot/medium/parrot_pixabay_3601194_1754896936891_medium.webp",
  "/categories/birds/P/peacock/medium/peacock_unsplash_laxlzcjbqn4_1754925927048_medium.webp",
  "/categories/birds/Q/quail/medium/quail_pixabay_8111479_1754896947015_medium.webp",
  "/categories/birds/R/raven/medium/raven_pixabay_4593865_1754896952788_medium.webp",
  "/categories/birds/S/sparrow/medium/sparrow_pixabay_7771181_1754896965458_medium.webp",

  // More Fruits (20)
  "/categories/fruits/G/gooseberry/medium/gooseberry_pixabay_8708000_1754841813982_medium.webp",
  "/categories/fruits/H/hardy_kiwi/medium/hardy_kiwi_pixabay_1565847_1754989414859_medium.webp",
  "/categories/fruits/J/jackfruit/medium/jackfruit_unsplash_sz6dkrfwcby_1754989928501_medium.webp",
  "/categories/fruits/K/key_lime/medium/key_lime_pixabay_3860300_1754990126056_medium.webp",
  "/categories/fruits/L/lemon/medium/lemon_unsplash_tfqjltmkeyy_1754990837972_medium.webp",
  "/categories/fruits/L/loganberry/medium/loganberry_pixabay_2343934_1754990908201_medium.webp",
  "/categories/fruits/M/mandarin/medium/mandarin_pixabay_6929463_1754841838490_medium.webp",
  "/categories/fruits/M/mango/medium/mango_pixabay_51995_1754940053383_medium.webp",
  "/categories/fruits/N/naranjilla/medium/naranjilla_pixabay_3214021_1754940068557_medium.webp",
  "/categories/fruits/N/navel_orange/medium/navel_orange_pixabay_272980_1754940074856_medium.webp",
  "/categories/fruits/O/olive/medium/olive_pixabay_1307154_1754940089917_medium.webp",
  "/categories/fruits/O/orange/medium/orange_unsplash_a4bbdjqu2co_1754991190779_medium.webp",
  "/categories/fruits/P/papaya/medium/papaya_pixabay_6918739_1754940102479_medium.webp",
  "/categories/fruits/P/peach/medium/peach_pixabay_583485_1754940108888_medium.webp",
  "/categories/fruits/Q/quandong/medium/quandong_pixabay_175569_1754940128529_medium.webp",
  "/categories/fruits/R/raspberry/medium/raspberry_pixabay_3243715_1754940144301_medium.webp",
  "/categories/fruits/S/strawberry/medium/strawberry_pixabay_1330459_1754992164863_medium.webp",
  "/categories/fruits/T/tangerine/medium/tangerine_pixabay_1721613_1754992191614_medium.webp",
  "/categories/fruits/U/ugli_fruit/medium/ugli_fruit_pixabay_1792246_1754940178831_medium.webp",
  "/categories/fruits/V/vanilla/medium/vanilla_pixabay_3378847_1754940188085_medium.webp",

  // Plants (20)
  "/categories/plants/A/agave/medium/agave_pixabay_384361_1754908671899_medium.webp",
  "/categories/plants/A/aloe/medium/aloe_pixabay_6544088_1754908675206_medium.webp",
  "/categories/plants/B/bamboo/medium/bamboo_pixabay_1283976_1754908689342_medium.webp",
  "/categories/plants/B/basil/medium/basil_pixabay_932079_1754908692356_medium.webp",
  "/categories/plants/C/cactus/medium/cactus_pixabay_7914007_1754908705590_medium.webp",
  "/categories/plants/D/daffodil/medium/daffodil_pixabay_1197602_1754908724740_medium.webp",
  "/categories/plants/E/echinacea/medium/echinacea_pixabay_861592_1754908746080_medium.webp",
  "/categories/plants/E/elderberry/medium/elderberry_pixabay_7983580_1754908749028_medium.webp",
  "/categories/plants/F/fern/medium/fern_pixabay_4493591_1754908762344_medium.webp",
  "/categories/plants/F/ficus/medium/ficus_pixabay_2682320_1754908768509_medium.webp",
  "/categories/plants/G/gardenia/medium/gardenia_pixabay_4608767_1754908793986_medium.webp",
  "/categories/plants/G/geranium/medium/geranium_pixabay_2616003_1754908801599_medium.webp",
  "/categories/plants/H/heather/medium/heather_pixabay_6757727_1754908828965_medium.webp",
  "/categories/plants/H/hibiscus/medium/hibiscus_pixabay_7577002_1754908835101_medium.webp",
  "/categories/plants/I/iceland_poppy/medium/iceland_poppy_pixabay_3352517_1754908861478_medium.webp",
  "/categories/plants/I/impatiens/medium/impatiens_pixabay_1603356_1754908867793_medium.webp",
  "/categories/plants/J/jacob_s_ladder/medium/jacob_s_ladder_pixabay_67598_1754908890033_medium.webp",
  "/categories/plants/J/jade_plant/medium/jade_plant_pixabay_3224249_1754908896331_medium.webp",
  "/categories/plants/K/kalanchoe/medium/kalanchoe_pixabay_1659532_1754908912894_medium.webp",
  "/categories/plants/L/lavender/medium/lavender_pixabay_1595581_1754908925659_medium.webp",
];

// Get random image from the curated list
const getRandomImage = () => {
  return CURATED_IMAGES[Math.floor(Math.random() * CURATED_IMAGES.length)];
};

// Get random delay between min and max seconds
const getRandomDelay = (min = 8, max = 15) => {
  return (Math.random() * (max - min) + min) * 1000;
};

const FlipCard = ({ initialImage, index }) => {
  const [currentImage, setCurrentImage] = useState(initialImage);
  const [isFlipping, setIsFlipping] = useState(false);

  useEffect(() => {
    // Set up interval for this specific card with random delay
    const flipInterval = setInterval(() => {
      setIsFlipping(true);

      // Change image halfway through the flip animation
      setTimeout(() => {
        setCurrentImage(getRandomImage());
      }, 400); // Half of the 800ms flip duration

      // Reset flipping state after animation completes
      setTimeout(() => {
        setIsFlipping(false);
      }, 800);
    }, getRandomDelay());

    return () => clearInterval(flipInterval);
  }, []);

  return (
    <div
      className="flip-card-container aspect-square"
      style={{
        perspective: "1000px",
        willChange: "transform",
      }}
    >
      <div
        className={`flip-card-inner w-full h-full ease-in-out ${
          isFlipping ? "rotate-y-180" : ""
        }`}
        style={{
          transformStyle: "preserve-3d",
          transform: isFlipping ? "rotateY(180deg)" : "rotateY(0deg)",
          transition: "transform 0.8s ease-in-out",
        }}
      >
        <div
          className="flip-card-face w-full h-full absolute backface-hidden bg-cover bg-center rounded-sm"
          style={{
            backgroundImage: `url(${getImageUrl(currentImage)})`,
            backfaceVisibility: "hidden",
          }}
        />
      </div>
    </div>
  );
};

const FlippingGridBackground = () => {
  // Create initial grid with random images
  const [gridSize, setGridSize] = useState({ cols: 4, rows: 4 });
  const [gridItems, setGridItems] = useState([]);

  useEffect(() => {
    // Adjust grid size based on screen size
    const updateGridSize = () => {
      if (window.innerWidth < 640) {
        setGridSize({ cols: 3, rows: 3 }); // Mobile
      } else if (window.innerWidth < 1024) {
        setGridSize({ cols: 4, rows: 4 }); // Tablet
      } else {
        setGridSize({ cols: 6, rows: 5 }); // Desktop
      }
    };

    updateGridSize();
    window.addEventListener("resize", updateGridSize);
    return () => window.removeEventListener("resize", updateGridSize);
  }, []);

  useEffect(() => {
    // Initialize grid with random images
    const totalCells = gridSize.cols * gridSize.rows;
    const items = Array.from({ length: totalCells }, (_, i) => ({
      id: i,
      image: getRandomImage(),
    }));
    setGridItems(items);
  }, [gridSize]);

  return (
    <div className="absolute inset-0 overflow-hidden" style={{ opacity: 0.4 }}>
      <div
        className="w-full h-full grid gap-0"
        style={{
          gridTemplateColumns: `repeat(${gridSize.cols}, 1fr)`,
          gridTemplateRows: `repeat(${gridSize.rows}, 1fr)`,
        }}
      >
        {gridItems.map((item) => (
          <FlipCard key={item.id} initialImage={item.image} index={item.id} />
        ))}
      </div>
    </div>
  );
};

export default FlippingGridBackground;
