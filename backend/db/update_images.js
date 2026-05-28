/**
 * Assigns image_url to recipes using stable Wikimedia Commons Special:FilePath redirects.
 * Recipes without a mapping get NULL (warm-gradient placeholder shown in UI).
 */
const { getDb } = require('./database');

const WC = (filename) =>
  `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(filename)}`;

// name → Wikimedia Commons filename
const IMAGE_MAP = {
  // ── Seed recipes ──────────────────────────────────────────────────
  'Tortilla Española':                          'Tortilla_de_patata.jpg',
  'Pasta al Pesto de Tomate':                   'Pasta_al_pomodoro.jpg',
  'Arroz con Pollo':                            'Arroz_con_pollo.jpg',
  'Ensalada Mediterránea':                      'Greek_salad.jpg',
  'Revuelto de Champiñones y Espinacas':        'Revuelto_de_huevos_y_champiñones.jpg',
  'Crema de Zanahoria':                         'Carrot_soup.jpg',
  'Salmón a la Plancha con Brócoli':            'Grilled_salmon_fillet.jpg',
  'Hamburguesa Casera':                         'Hamburger.jpg',
  'Patatas Bravas':                             'Patatas_bravas.jpg',
  'Pasta a la Carbonara':                       'Spaghetti_alla_carbonara.jpg',

  // ── Saladas recipes ───────────────────────────────────────────────
  'Arroz meloso con pollo y verduras':          'Arroz_con_pollo.jpg',
  'Fideuá sencilla de salmón':                  'Fideuà.jpg',
  'Macarrones gratinados con carne y verduras': 'Pasta_al_forno.jpg',
  'Risotto de champiñones y queso azul':        'Risotto_ai_funghi.jpg',
  'Salmón con salsa cremosa de champiñones':    'Salmon_with_cream_sauce.jpg',
  'Albóndigas caseras en salsa de tomate':      'Albondigas_en_salsa_de_tomate.jpg',
  'Risotto de calabaza':                        'Pumpkin_risotto.jpg',
  'Pechugas de pollo al limón':                 'Chicken_piccata.jpg',
  'Garbanzos al curry con albóndigas rápidas':  'Chickpea_curry.jpg',
  'Pollo empanado al horno con avena':          'Chicken_tenders.jpg',
  'Empanadillas de carne y pimientos':          'Empanadillas.jpg',
  'Tortilla de patatas ligera':                 'Tortilla_de_patata.jpg',
  'Tosta de lomo con aguacate':                 'Avocado_toast.jpg',
  'Judías verdes con setas y espárragos':       'Green_beans_with_mushrooms.jpg',
  'Gazpacho manchego con pollo':                'Gazpacho_manchego.jpg',
  'Carpaccio de tomate con burrata':            'Caprese_salad.jpg',
  'Pasta con tomate, queso y verduras':         'Pasta_al_pomodoro.jpg',
  'Merluza en salsa verde':                     'Merluza_en_salsa_verde.jpg',
  'Ensalada templada de garbanzos y pollo':     'Chickpea_salad.jpg',
  'Tacos de ternera y pimientos':               'Beef_tacos.jpg',
  'Crema de calabaza con queso':                'Pumpkin_soup.jpg',
  'Huevos al plato con tomate y guisantes':     'Shakshuka.jpg',
  'Cuscús con verduras y pollo':                'Couscous.jpg',
  'Pisto con huevo':                            'Pisto_manchego.jpg',
  'Wrap de salmón ahumado y aguacate':          'Smoked_salmon_wrap.jpg',
  'Patatas panadera con pescado':               'Fish_with_potatoes.jpg',
  'Ensalada de arroz con atún y huevo':         'Rice_salad.jpg',
  'Quesadillas de jamón y queso':               'Quesadilla.jpg',
  'Sopa de verduras con fideos':                'Minestrone.jpg',
  'Lentejas con chorizo':                       'Lentejas_con_chorizo.jpg',
  'Pollo al horno con patatas':                 'Roast_chicken.jpg',
  'Ensaladilla rusa casera':                    'Ensaladilla_rusa.jpg',
  'Gazpacho andaluz':                           'Gazpacho.jpg',
  'Croquetas de jamón':                         'Croquetas_de_jamón.jpg',
  'Garbanzos con espinacas al ajillo':          'Garbanzos_con_espinacas.jpg',
  'Judías verdes con patata y huevo':           'Judías_verdes_con_patata.jpg',
  'Filetes empanados':                          'Schnitzel.jpg',
  'Paella sencilla de pollo':                   'Paella_01.jpg',
  'Pasta con atún y tomate':                    'Pasta_al_tonno.jpg',

  // ── Markdown recipes ──────────────────────────────────────────────
  'Albóndigas con guisantes':                   'Albondigas_en_salsa_de_tomate.jpg',
  'Arroz negro':                                'Arroz_negro.jpg',
  'Atún escabechado':                           'Escabeche.jpg',
  'Bacalao confitado con calabaza y queso':     'Bacalao_al_pil-pil.jpg',
  'Bacalao frito con garbanzos y espinacas':    'Bacalao_frito.jpg',
  'Batido de plátano y nueces con soja':        'Banana_smoothie.jpg',
  'Berenjenas rellenas':                        'Stuffed_eggplant.jpg',
  'Bonito en sanfaina':                         'Samfaina.jpg',
  'Buñuelos de bacalao':                        'Buñuelos_de_bacalao.jpg',
  'Buñuelos de cuaresma':                       'Buñuelos.jpg',
  'Caldo vegetal':                              'Vegetable_broth.jpg',
  'Conchas de pescado':                         'Coquilles_Saint-Jacques.jpg',
  'Coulant de chocolate':                       'Chocolate_lava_cake.jpg',
  'Crema de aguacate y yogur':                  'Avocado_cream.jpg',
  'Crema de arroz con leche':                   'Arroz_con_leche.jpg',
  'Crema de calabaza a la naranja':             'Pumpkin_soup.jpg',
  'Crema de castaña':                           'Chestnut_soup.jpg',
  'Crema de melón con jamón':                   'Melon_soup.jpg',
  'Crema de zanahoria con nata':                'Carrot_soup.jpg',
  'Crema verde':                                'Green_soup.jpg',
  'Crujientes de pollo':                        'Chicken_tenders.jpg',
  'Cuscús con aguacate y pistachos':            'Couscous_salad.jpg',
  'Delicias de frutas rojas':                   'Mixed_berry_dessert.jpg',
  'Empanadillas de atún':                       'Empanadillas.jpg',
  'Escudella de Navidad':                       'Escudella_i_carn_d%27olla.jpg',
  'Espuma de manzana':                          'Apple_mousse.jpg',
  'Estofado de ternera':                        'Beef_stew.jpg',
  'Flan de berenjena asada':                    'Eggplant_flan.jpg',
  'Galletas de boniato':                        'Sweet_potato_cookies.jpg',
  'Gelatina de mojito':                         'Mojito.jpg',
  'Gelatina de naranja':                        'Orange_jelly.jpg',
  'Guiso de judías blancas con arroz':          'White_bean_stew.jpg',
  'Guiso de lentejas rojas':                    'Red_lentil_soup.jpg',
  'Hamburguesas de merluza y gambas':           'Fish_burger.jpg',
  'Hummus de berenjena':                        'Baba_ganoush.jpg',
  'Kéfir con fresas y semillas de amapola':     'Kefir_with_strawberries.jpg',
  'Lomo con salsa de almendras':                'Pork_loin.jpg',
  'Mantequilla de coco':                        'Coconut_butter.jpg',
  'Manzanas asadas':                            'Baked_apples.jpg',
  'Mijo con acelgas y calabaza':                'Millet_grain.jpg',
  'Mousse de aguacate y chocolate':             'Chocolate_mousse.jpg',
  'Mousse de turrón':                           'Turrón.jpg',
  'Panecillos dulces':                          'Sweet_rolls.jpg',
  'Papaya con crema de almendras':              'Papaya.jpg',
  'Pastel de limón':                            'Lemon_cake.jpg',
  'Paté marinero':                              'Fish_p%C3%A2t%C3%A9.jpg',
  'Pechugas de pollo con champiñones':          'Chicken_with_mushrooms.jpg',
  'Pollo caramelizado con miel':                'Honey_garlic_chicken.jpg',
  'Pudin de pera y plátano':                    'Bread_pudding.jpg',
  'Puré de patatas con quinoa':                 'Mashed_potatoes.jpg',
  'Queso con dulce de membrillo casero':        'Queso_manchego_con_membrillo.jpg',
  'Remolacha asada con yogur griego':           'Roasted_beetroot.jpg',
  'Rocas de chocolate':                         'Chocolate_bark.jpg',
  'Salmorejo':                                  'Salmorejo.jpg',
  'Salmón con manzanas':                        'Salmon_with_apples.jpg',
  'Salpicón de marisco con quinoa':             'Salpicón_de_marisco.jpg',
  'Solomillo con salsa de calabaza':            'Sirloin_steak.jpg',
  'Sopa de cebolla':                            'French_onion_soup.jpg',
  'Sopa de gallina con fideos de espelta':      'Chicken_noodle_soup.jpg',
  'Tarta de Queso':                             'Cheesecake_slice.jpg',
  'Tortilla de patata rellena de jamón y queso':'Tortilla_de_patata.jpg',
  'Tortilla de patata sin huevos':              'Tortilla_de_patata.jpg',
  'Tortitas de calabacín con salsa de yogur':   'Zucchini_fritters.jpg',
};

function updateImages() {
  const db = getDb();

  const update = db.prepare('UPDATE recipes SET image_url = ? WHERE name = ?');

  let updated = 0;
  let skipped = 0;

  db.exec('BEGIN');
  try {
    for (const [name, filename] of Object.entries(IMAGE_MAP)) {
      const url = WC(filename);
      const result = update.run(url, name);
      if (result.changes > 0) {
        updated += result.changes;
      } else {
        skipped++;
      }
    }
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }

  console.log(`Updated ${updated} recipes with image URLs. (${skipped} names not matched in DB)`);
}

updateImages();
