const { getDb } = require('./database');

// 30 recipes from recetas_saladas_originales_retocadas.md
// + 10 extra common Spanish home-cooking recipes
// Ingredients are normalized to canonical English names for the matching engine.
// Instructions keep the original Spanish numbered steps.

const SALADAS_RECIPES = [
  // ── From recetas_saladas_originales_retocadas.md ──────────────
  {
    name: 'Arroz meloso con pollo y verduras',
    ingredients: ['chicken', 'rice', 'onion', 'pepper', 'carrot', 'garlic', 'tomato', 'olive oil'],
    instructions:
      '1. Dora el pollo en una cazuela con un poco de aceite, sal y pimienta.\n' +
      '2. Añade la cebolla, el ajo, el pimiento y la zanahoria picados.\n' +
      '3. Sofríe hasta que las verduras estén blandas.\n' +
      '4. Incorpora el tomate y cocina unos minutos hasta que reduzca.\n' +
      '5. Añade el pimentón y remueve rápido para que no se queme.\n' +
      '6. Agrega el arroz y mezcla bien con el sofrito.\n' +
      '7. Vierte el caldo caliente y cocina a fuego medio, removiendo de vez en cuando.\n' +
      '8. Cuando el arroz esté tierno y quede cremoso, apaga el fuego y deja reposar 5 minutos.',
    prep_time: 45, difficulty: 'medium',
    tags: ['spanish', 'high-protein'],
  },
  {
    name: 'Fideuá sencilla de salmón',
    ingredients: ['salmon', 'pasta', 'onion', 'pepper', 'garlic', 'tomato', 'olive oil'],
    instructions:
      '1. Sofríe la cebolla, el pimiento y el ajo picados en una paellera o sartén amplia.\n' +
      '2. Añade el tomate triturado y deja cocinar unos minutos.\n' +
      '3. Incorpora los fideos y tuéstalos ligeramente con el sofrito.\n' +
      '4. Vierte el caldo caliente y cocina a fuego medio.\n' +
      '5. A mitad de cocción, añade los dados de salmón salpimentados.\n' +
      '6. Cocina hasta que los fideos estén en su punto y el caldo se haya absorbido.\n' +
      '7. Deja reposar unos minutos y termina con perejil si quieres.',
    prep_time: 40, difficulty: 'medium',
    tags: ['spanish', 'high-protein'],
  },
  {
    name: 'Macarrones gratinados con carne y verduras',
    ingredients: ['pasta', 'beef', 'onion', 'carrot', 'pepper', 'tomato', 'cheese', 'olive oil'],
    instructions:
      '1. Cuece los macarrones en agua con sal y escúrrelos.\n' +
      '2. Sofríe la cebolla, la zanahoria y el pimiento picados.\n' +
      '3. Añade la carne picada y cocina hasta que cambie de color.\n' +
      '4. Incorpora el tomate, sal, pimienta y orégano.\n' +
      '5. Mezcla la salsa con los macarrones.\n' +
      '6. Coloca todo en una fuente de horno, añade queso rallado y gratina hasta dorar.',
    prep_time: 50, difficulty: 'easy',
    tags: ['high-protein'],
  },
  {
    name: 'Risotto de champiñones y queso azul',
    ingredients: ['rice', 'mushroom', 'onion', 'cheese', 'butter', 'olive oil'],
    instructions:
      '1. Sofríe el puerro o cebolla picado con aceite.\n' +
      '2. Añade los champiñones laminados y cocina hasta que pierdan agua.\n' +
      '3. Incorpora el arroz y remueve un minuto.\n' +
      '4. Añade caldo caliente poco a poco, removiendo con frecuencia.\n' +
      '5. Cuando el arroz esté cremoso y tierno, agrega mantequilla y queso azul.\n' +
      '6. Mezcla bien, ajusta de sal y sirve al momento.',
    prep_time: 35, difficulty: 'medium',
    tags: ['vegetarian', 'italian'],
  },
  {
    name: 'Salmón con salsa cremosa de champiñones',
    ingredients: ['salmon', 'mushroom', 'garlic', 'milk', 'olive oil', 'lemon'],
    instructions:
      '1. Salpimienta el salmón y cocínalo a la plancha por ambos lados.\n' +
      '2. Retíralo y reserva.\n' +
      '3. En la misma sartén, sofríe el ajo picado y los champiñones laminados.\n' +
      '4. Añade la nata o leche evaporada y cocina hasta que la salsa espese ligeramente.\n' +
      '5. Devuelve el salmón a la sartén y cocina dos minutos más.\n' +
      '6. Sirve con unas gotas de limón si te gusta.',
    prep_time: 25, difficulty: 'easy',
    tags: ['high-protein', 'quick'],
  },
  {
    name: 'Albóndigas caseras en salsa de tomate',
    ingredients: ['beef', 'egg', 'bread', 'garlic', 'tomato', 'onion', 'carrot', 'flour', 'olive oil'],
    instructions:
      '1. Mezcla la carne con huevo, ajo, perejil, pan rallado, sal y pimienta.\n' +
      '2. Forma albóndigas y pásalas ligeramente por harina.\n' +
      '3. Dóralas en una sartén y reserva.\n' +
      '4. Sofríe cebolla y zanahoria picadas.\n' +
      '5. Añade el tomate triturado y cocina 10 minutos.\n' +
      '6. Incorpora las albóndigas y cocina todo junto 20 minutos.',
    prep_time: 60, difficulty: 'medium',
    tags: ['spanish', 'high-protein'],
  },
  {
    name: 'Risotto de calabaza',
    ingredients: ['rice', 'onion', 'cheese', 'olive oil'],
    instructions:
      '1. Corta la calabaza en dados pequeños.\n' +
      '2. Sofríe la cebolla picada con aceite.\n' +
      '3. Añade la calabaza y cocina unos minutos.\n' +
      '4. Incorpora el arroz y mezcla.\n' +
      '5. Agrega caldo caliente poco a poco, removiendo hasta que el arroz esté cremoso.\n' +
      '6. Termina con parmesano, sal y pimienta.',
    prep_time: 45, difficulty: 'medium',
    tags: ['vegetarian', 'italian'],
  },
  {
    name: 'Pechugas de pollo al limón',
    ingredients: ['chicken', 'lemon', 'garlic', 'flour', 'olive oil'],
    instructions:
      '1. Salpimienta el pollo y dóralo en una sartén.\n' +
      '2. Retira el pollo y reserva.\n' +
      '3. En la misma sartén, añade ajo, zumo de limón, miel y agua.\n' +
      '4. Disuelve la maicena en un poco de agua fría y añádela a la salsa.\n' +
      '5. Devuelve el pollo a la sartén y cocina hasta que la salsa espese.\n' +
      '6. Termina con perejil picado.',
    prep_time: 20, difficulty: 'easy',
    tags: ['high-protein', 'quick', 'spanish'],
  },
  {
    name: 'Garbanzos al curry con albóndigas rápidas',
    ingredients: ['beef', 'egg', 'onion', 'carrot', 'olive oil'],
    instructions:
      '1. Mezcla la carne con huevo, sal y pimienta.\n' +
      '2. Forma bolitas pequeñas y dóralas.\n' +
      '3. Sofríe cebolla y zanahoria picadas.\n' +
      '4. Añade curry, garbanzos cocidos y caldo.\n' +
      '5. Incorpora las albóndigas y cocina 15-20 minutos.\n' +
      '6. Sirve caliente con arroz si quieres hacerlo más completo.',
    prep_time: 45, difficulty: 'easy',
    tags: ['high-protein', 'spanish'],
  },
  {
    name: 'Pollo empanado al horno con avena',
    ingredients: ['chicken', 'egg', 'flour', 'olive oil'],
    instructions:
      '1. Precalienta el horno a 200 ºC.\n' +
      '2. Sazona el pollo con sal, pimienta y ajo.\n' +
      '3. Pasa cada tira por huevo batido y después por avena triturada o pan rallado.\n' +
      '4. Coloca en una bandeja con papel de horno.\n' +
      '5. Añade un hilo de aceite y hornea hasta que esté dorado.',
    prep_time: 35, difficulty: 'easy',
    tags: ['high-protein', 'healthy'],
  },
  {
    name: 'Empanadillas de carne y pimientos',
    ingredients: ['beef', 'pepper', 'onion', 'tomato', 'egg', 'flour', 'olive oil'],
    instructions:
      '1. Sofríe cebolla y pimientos picados.\n' +
      '2. Añade la carne y cocina hasta que esté hecha.\n' +
      '3. Incorpora tomate frito, pimentón, sal y pimienta.\n' +
      '4. Rellena las obleas con la mezcla.\n' +
      '5. Cierra con un tenedor y pinta con huevo batido.\n' +
      '6. Hornea a 200 ºC hasta que estén doradas.',
    prep_time: 50, difficulty: 'medium',
    tags: ['spanish'],
  },
  {
    name: 'Tortilla de patatas ligera',
    ingredients: ['potato', 'egg', 'onion', 'olive oil'],
    instructions:
      '1. Pela y corta las patatas en láminas finas.\n' +
      '2. Cocínalas en sartén con poco aceite o al microondas hasta que estén tiernas.\n' +
      '3. Bate los huevos con sal.\n' +
      '4. Mezcla las patatas con el huevo.\n' +
      '5. Cuaja la tortilla en una sartén por ambos lados.\n' +
      '6. Deja reposar unos minutos antes de cortar.',
    prep_time: 35, difficulty: 'easy',
    tags: ['vegetarian', 'spanish'],
  },
  {
    name: 'Tosta de lomo con aguacate',
    ingredients: ['bread', 'olive oil', 'lemon'],
    instructions:
      '1. Corta la calabaza en dados pequeños y saltéala hasta que esté tierna.\n' +
      '2. Tuesta el pan.\n' +
      '3. Machaca el aguacate con limón, sal y pimienta.\n' +
      '4. Cocina el lomo a la plancha.\n' +
      '5. Monta la tosta con aguacate, lomo y calabaza.\n' +
      '6. Añade un hilo de aceite antes de servir.',
    prep_time: 20, difficulty: 'easy',
    tags: ['quick', 'healthy'],
  },
  {
    name: 'Judías verdes con setas y espárragos',
    ingredients: ['mushroom', 'garlic', 'olive oil'],
    instructions:
      '1. Cuece las judías verdes hasta que estén tiernas pero firmes.\n' +
      '2. Saltea ajo picado con setas y espárragos troceados.\n' +
      '3. Añade las judías escurridas.\n' +
      '4. Salpimienta y saltea unos minutos más.\n' +
      '5. Termina con semillas de sésamo si quieres.',
    prep_time: 30, difficulty: 'easy',
    tags: ['vegetarian', 'vegan', 'healthy', 'quick'],
  },
  {
    name: 'Gazpacho manchego con pollo',
    ingredients: ['chicken', 'onion', 'pepper', 'tomato', 'bread', 'olive oil'],
    instructions:
      '1. Dora el pollo en una cazuela con aceite.\n' +
      '2. Añade cebolla y pimiento picados.\n' +
      '3. Incorpora tomate rallado y cocina hasta que reduzca.\n' +
      '4. Añade pimentón, sal y pimienta.\n' +
      '5. Vierte el caldo y deja cocer hasta que el pollo esté tierno.\n' +
      '6. Agrega la torta o pan troceado y cocina hasta que absorba parte del caldo.\n' +
      '7. Sirve caliente y jugoso.',
    prep_time: 60, difficulty: 'medium',
    tags: ['spanish', 'high-protein'],
  },
  {
    name: 'Carpaccio de tomate con burrata',
    ingredients: ['tomato', 'cheese', 'olive oil'],
    instructions:
      '1. Corta los tomates en rodajas muy finas.\n' +
      '2. Colócalos extendidos en un plato.\n' +
      '3. Añade sal, pimienta, aceite y unas gotas de vinagre balsámico.\n' +
      '4. Coloca la burrata en el centro.\n' +
      '5. Añade frutos secos si quieres.\n' +
      '6. Sirve frío o a temperatura ambiente.',
    prep_time: 15, difficulty: 'easy',
    tags: ['vegetarian', 'quick', 'healthy'],
  },
  {
    name: 'Pasta con tomate, queso y verduras',
    ingredients: ['pasta', 'zucchini', 'onion', 'tomato', 'cheese', 'olive oil'],
    instructions:
      '1. Cuece la pasta en agua con sal.\n' +
      '2. Sofríe cebolla, calabacín y berenjena en dados.\n' +
      '3. Añade tomate triturado, sal, pimienta y orégano.\n' +
      '4. Cocina hasta que la salsa espese.\n' +
      '5. Mezcla con la pasta.\n' +
      '6. Sirve con queso rallado.',
    prep_time: 30, difficulty: 'easy',
    tags: ['vegetarian', 'italian'],
  },
  {
    name: 'Merluza en salsa verde',
    ingredients: ['garlic', 'flour', 'olive oil'],
    instructions:
      '1. Sofríe los ajos picados con aceite.\n' +
      '2. Añade la harina y remueve durante unos segundos.\n' +
      '3. Vierte el caldo de pescado poco a poco para formar la salsa.\n' +
      '4. Añade la merluza y los guisantes si tienes.\n' +
      '5. Cocina tapado durante 8-10 minutos.\n' +
      '6. Termina con perejil picado.',
    prep_time: 25, difficulty: 'easy',
    tags: ['high-protein', 'quick', 'spanish'],
  },
  {
    name: 'Ensalada templada de garbanzos y pollo',
    ingredients: ['chicken', 'onion', 'tomato', 'spinach', 'olive oil'],
    instructions:
      '1. Cocina el pollo en tiras en una sartén con sal y pimienta.\n' +
      '2. Retira el pollo y sofríe la cebolla.\n' +
      '3. Añade los garbanzos cocidos y comino.\n' +
      '4. Incorpora las espinacas y el tomate en dados.\n' +
      '5. Mezcla con el pollo y sirve templado.',
    prep_time: 25, difficulty: 'easy',
    tags: ['high-protein', 'healthy', 'quick'],
  },
  {
    name: 'Tacos de ternera y pimientos',
    ingredients: ['beef', 'pepper', 'onion', 'flour', 'olive oil'],
    instructions:
      '1. Corta los pimientos y la cebolla en tiras.\n' +
      '2. Saltea las verduras hasta que estén tiernas.\n' +
      '3. Añade la ternera en tiras y las especias al gusto.\n' +
      '4. Cocina a fuego fuerte hasta que la carne esté hecha.\n' +
      '5. Calienta las tortillas.\n' +
      '6. Rellena y sirve al momento.',
    prep_time: 25, difficulty: 'easy',
    tags: ['high-protein', 'quick'],
  },
  {
    name: 'Crema de calabaza con queso',
    ingredients: ['potato', 'carrot', 'onion', 'cheese', 'olive oil'],
    instructions:
      '1. Trocea la calabaza, patata, zanahoria y cebolla.\n' +
      '2. Sofríe la cebolla con aceite.\n' +
      '3. Añade el resto de verduras y cubre con caldo.\n' +
      '4. Cuece hasta que todo esté blando.\n' +
      '5. Tritura hasta obtener una crema fina.\n' +
      '6. Sirve con queso por encima.',
    prep_time: 35, difficulty: 'easy',
    tags: ['vegetarian', 'healthy'],
  },
  {
    name: 'Huevos al plato con tomate y guisantes',
    ingredients: ['egg', 'tomato', 'olive oil'],
    instructions:
      '1. Cocina el tomate triturado en una sartén con aceite, sal y pimienta.\n' +
      '2. Añade los guisantes.\n' +
      '3. Reparte la mezcla en cazuelitas aptas para horno.\n' +
      '4. Casca los huevos encima.\n' +
      '5. Hornea hasta que la clara cuaje.\n' +
      '6. Sirve caliente con pan.',
    prep_time: 25, difficulty: 'easy',
    tags: ['vegetarian', 'quick'],
  },
  {
    name: 'Cuscús con verduras y pollo',
    ingredients: ['chicken', 'zucchini', 'carrot', 'onion', 'pepper', 'olive oil'],
    instructions:
      '1. Hidrata el cuscús con caldo caliente y deja reposar.\n' +
      '2. Saltea el pollo en dados con sal, pimienta y curry suave.\n' +
      '3. Añade las verduras en dados.\n' +
      '4. Cocina hasta que estén tiernas.\n' +
      '5. Suelta el cuscús con un tenedor.\n' +
      '6. Mezcla todo y sirve.',
    prep_time: 30, difficulty: 'easy',
    tags: ['high-protein', 'healthy'],
  },
  {
    name: 'Pisto con huevo',
    ingredients: ['zucchini', 'onion', 'pepper', 'tomato', 'egg', 'olive oil'],
    instructions:
      '1. Pica todas las verduras en dados pequeños.\n' +
      '2. Sofríe primero la cebolla y el pimiento.\n' +
      '3. Añade calabacín y berenjena.\n' +
      '4. Incorpora el tomate triturado, sal y pimienta.\n' +
      '5. Cocina hasta que las verduras estén tiernas y el tomate reducido.\n' +
      '6. Sirve con un huevo a la plancha encima.',
    prep_time: 40, difficulty: 'easy',
    tags: ['vegetarian', 'vegan', 'spanish', 'healthy'],
  },
  {
    name: 'Wrap de salmón ahumado y aguacate',
    ingredients: ['salmon', 'cheese', 'lettuce', 'cucumber', 'lemon', 'flour'],
    instructions:
      '1. Unta queso crema en cada tortilla de trigo.\n' +
      '2. Añade lechuga, pepino en tiras y salmón ahumado.\n' +
      '3. Corta el aguacate y rocíalo con limón.\n' +
      '4. Añádelo al wrap.\n' +
      '5. Enrolla bien y corta por la mitad.',
    prep_time: 10, difficulty: 'easy',
    tags: ['high-protein', 'quick', 'healthy'],
  },
  {
    name: 'Patatas panadera con pescado',
    ingredients: ['potato', 'onion', 'pepper', 'olive oil', 'lemon'],
    instructions:
      '1. Corta patatas, cebolla y pimiento en rodajas finas.\n' +
      '2. Colócalas en una bandeja con aceite, sal y pimienta.\n' +
      '3. Hornea a 190 ºC durante 25-30 minutos.\n' +
      '4. Añade el pescado encima con zumo de limón.\n' +
      '5. Hornea 10-12 minutos más.\n' +
      '6. Sirve recién hecho.',
    prep_time: 45, difficulty: 'easy',
    tags: ['spanish', 'healthy'],
  },
  {
    name: 'Ensalada de arroz con atún y huevo',
    ingredients: ['rice', 'tuna', 'egg', 'tomato', 'corn', 'olive oil'],
    instructions:
      '1. Cuece el arroz y enfríalo.\n' +
      '2. Cuece los huevos y córtalos.\n' +
      '3. Mezcla arroz, atún, tomate en dados, maíz, aceitunas y huevo.\n' +
      '4. Aliña con aceite, vinagre y sal.\n' +
      '5. Guarda en frío hasta servir.',
    prep_time: 25, difficulty: 'easy',
    tags: ['quick', 'high-protein', 'healthy'],
  },
  {
    name: 'Quesadillas de jamón y queso',
    ingredients: ['cheese', 'flour'],
    instructions:
      '1. Coloca queso rallado y jamón cocido sobre una tortilla de trigo.\n' +
      '2. Añade tomate en dados y orégano si quieres.\n' +
      '3. Tapa con otra tortilla.\n' +
      '4. Dora en sartén por ambos lados hasta que el queso se funda.\n' +
      '5. Corta en triángulos y sirve.',
    prep_time: 15, difficulty: 'easy',
    tags: ['quick'],
  },
  {
    name: 'Sopa de verduras con fideos',
    ingredients: ['carrot', 'zucchini', 'potato', 'pasta', 'olive oil'],
    instructions:
      '1. Pica todas las verduras en trozos pequeños.\n' +
      '2. Calienta el caldo en una olla.\n' +
      '3. Añade las verduras y cocina hasta que estén tiernas.\n' +
      '4. Incorpora los fideos.\n' +
      '5. Cocina hasta que la pasta esté hecha.\n' +
      '6. Ajusta de sal y sirve caliente.',
    prep_time: 30, difficulty: 'easy',
    tags: ['vegetarian', 'vegan', 'healthy'],
  },

  // ── Extra common Spanish home-cooking recipes ─────────────────
  {
    name: 'Lentejas con chorizo',
    ingredients: ['carrot', 'onion', 'garlic', 'potato', 'tomato', 'olive oil'],
    instructions:
      '1. Sofríe la cebolla, el ajo y el tomate troceados con aceite.\n' +
      '2. Añade el chorizo en rodajas y rehoga un par de minutos.\n' +
      '3. Incorpora las lentejas lavadas, la zanahoria y la patata en dados.\n' +
      '4. Cubre con agua o caldo y cocina a fuego medio 35-40 minutos.\n' +
      '5. Ajusta de sal, pimentón y laurel.\n' +
      '6. Sirve caliente con un chorrito de vinagre si te gusta.',
    prep_time: 50, difficulty: 'easy',
    tags: ['spanish', 'high-protein', 'healthy'],
  },
  {
    name: 'Pollo al horno con patatas',
    ingredients: ['chicken', 'potato', 'garlic', 'lemon', 'olive oil'],
    instructions:
      '1. Precalienta el horno a 200 ºC.\n' +
      '2. Corta las patatas en gajos y colócalas en una bandeja con aceite y sal.\n' +
      '3. Añade el pollo troceado encima, con ajo, limón, romero y pimienta.\n' +
      '4. Rocía todo con aceite y hornea 45-55 minutos.\n' +
      '5. A mitad de cocción, riega el pollo con sus propios jugos.\n' +
      '6. Sirve recién salido del horno.',
    prep_time: 65, difficulty: 'easy',
    tags: ['spanish', 'high-protein'],
  },
  {
    name: 'Ensaladilla rusa casera',
    ingredients: ['potato', 'carrot', 'egg', 'tuna', 'corn', 'olive oil'],
    instructions:
      '1. Cuece las patatas y zanahorias en dados hasta que estén tiernas. Escurre y deja enfriar.\n' +
      '2. Cuece los huevos, pélalos y pícalos.\n' +
      '3. Mezcla patatas, zanahoria, atún escurrido, maíz, huevo y aceitunas.\n' +
      '4. Añade mayonesa y mezcla con cuidado.\n' +
      '5. Ajusta de sal y reserva en frío al menos 1 hora.\n' +
      '6. Sirve fría decorada con huevo y aceitunas.',
    prep_time: 40, difficulty: 'easy',
    tags: ['spanish', 'healthy'],
  },
  {
    name: 'Gazpacho andaluz',
    ingredients: ['tomato', 'cucumber', 'pepper', 'garlic', 'bread', 'olive oil'],
    instructions:
      '1. Trocea el tomate, el pepino pelado, el pimiento y el ajo.\n' +
      '2. Añade el pan remojado en agua, aceite, vinagre y sal.\n' +
      '3. Tritura todo hasta obtener una crema fina.\n' +
      '4. Cuela si quieres una textura más suave.\n' +
      '5. Refrigera al menos 2 horas.\n' +
      '6. Sirve muy frío con guarnición de pepino, tomate y pimiento en daditos.',
    prep_time: 15, difficulty: 'easy',
    tags: ['vegetarian', 'vegan', 'spanish', 'healthy', 'quick'],
  },
  {
    name: 'Croquetas de jamón',
    ingredients: ['flour', 'milk', 'butter', 'egg', 'bread'],
    instructions:
      '1. Derrite la mantequilla y sofríe el jamón picado fino.\n' +
      '2. Añade la harina y remueve 2-3 minutos a fuego suave.\n' +
      '3. Incorpora la leche caliente poco a poco sin dejar de remover hasta obtener una bechamel espesa.\n' +
      '4. Salpimenta y deja enfriar en bandeja tapada con film. Refrigera 2 horas.\n' +
      '5. Forma las croquetas, pásalas por huevo y pan rallado.\n' +
      '6. Fríe en aceite abundante hasta dorar. Escurre y sirve calientes.',
    prep_time: 60, difficulty: 'medium',
    tags: ['spanish'],
  },
  {
    name: 'Garbanzos con espinacas al ajillo',
    ingredients: ['spinach', 'garlic', 'tomato', 'olive oil'],
    instructions:
      '1. Sofríe el ajo laminado en aceite hasta que empiece a dorarse.\n' +
      '2. Añade el tomate triturado y una cucharadita de comino y pimentón.\n' +
      '3. Cocina 5 minutos.\n' +
      '4. Incorpora los garbanzos cocidos escurridos y mezcla.\n' +
      '5. Añade las espinacas y cocina hasta que se integren.\n' +
      '6. Ajusta de sal y sirve con un chorrito de limón.',
    prep_time: 20, difficulty: 'easy',
    tags: ['vegetarian', 'vegan', 'spanish', 'healthy', 'quick', 'high-protein'],
  },
  {
    name: 'Judías verdes con patata y huevo',
    ingredients: ['potato', 'egg', 'garlic', 'olive oil'],
    instructions:
      '1. Cuece las judías verdes y las patatas en dados en agua con sal.\n' +
      '2. Cuece los huevos aparte.\n' +
      '3. Escurre verduras y patatas y pásalas a una fuente.\n' +
      '4. Sofríe el ajo laminado en aceite hasta que dore.\n' +
      '5. Riega las verduras con el sofrito de ajo caliente.\n' +
      '6. Corta el huevo cocido por encima y sirve tibio.',
    prep_time: 30, difficulty: 'easy',
    tags: ['vegetarian', 'spanish', 'healthy'],
  },
  {
    name: 'Filetes empanados',
    ingredients: ['beef', 'egg', 'flour', 'bread', 'olive oil', 'lemon'],
    instructions:
      '1. Aplana los filetes con un mazo, salpimienta.\n' +
      '2. Pasa cada filete por harina, luego por huevo batido y finalmente por pan rallado.\n' +
      '3. Fríe en aceite abundante a fuego medio-alto hasta que estén dorados.\n' +
      '4. Escurre sobre papel absorbente.\n' +
      '5. Sirve con unas gotas de limón y ensalada o patatas.',
    prep_time: 25, difficulty: 'easy',
    tags: ['high-protein', 'quick', 'spanish'],
  },
  {
    name: 'Paella sencilla de pollo',
    ingredients: ['chicken', 'rice', 'onion', 'garlic', 'pepper', 'tomato', 'olive oil'],
    instructions:
      '1. Sofríe el pollo troceado en la paellera con aceite hasta que dore.\n' +
      '2. Añade la cebolla, el ajo y el pimiento picados.\n' +
      '3. Incorpora el tomate rallado y el pimentón, rehoga 2 minutos.\n' +
      '4. Añade el arroz y remueve para que se impregne del sofrito.\n' +
      '5. Vierte el caldo caliente (doble que de arroz) y el azafrán.\n' +
      '6. Cocina a fuego fuerte 5 minutos y luego a fuego medio 12-15 minutos sin remover.\n' +
      '7. Deja reposar tapado 5 minutos antes de servir.',
    prep_time: 50, difficulty: 'medium',
    tags: ['spanish', 'high-protein'],
  },
  {
    name: 'Pasta con atún y tomate',
    ingredients: ['pasta', 'tuna', 'tomato', 'garlic', 'onion', 'olive oil'],
    instructions:
      '1. Cuece la pasta en agua con sal hasta que esté al dente.\n' +
      '2. Sofríe el ajo y la cebolla picados en aceite.\n' +
      '3. Añade el tomate triturado y cocina 10-12 minutos.\n' +
      '4. Incorpora el atún escurrido y mezcla.\n' +
      '5. Escurre la pasta y agrégala a la salsa.\n' +
      '6. Mezcla bien y sirve con orégano o perejil.',
    prep_time: 25, difficulty: 'easy',
    tags: ['quick', 'high-protein'],
  },
];

function seedSaladasRecipes() {
  const db = getDb();

  // Idempotency guard: skip if saladas recipes already exist
  const existing = db.prepare("SELECT COUNT(*) as n FROM recipes WHERE source = 'saladas'").get();
  if (existing.n > 0) {
    console.log(`Saladas recipes already seeded (${existing.n} found). Skipping.`);
    return;
  }

  const insert = db.prepare(
    `INSERT INTO recipes (name, ingredients, instructions, prep_time, difficulty, tags, source)
     VALUES (?, ?, ?, ?, ?, ?, 'saladas')`
  );

  let inserted = 0;
  let skipped  = 0;
  db.exec('BEGIN');
  try {
    for (const r of SALADAS_RECIPES) {
      const dup = db.prepare('SELECT id FROM recipes WHERE name = ?').get(r.name);
      if (dup) { skipped++; continue; }
      insert.run(r.name, JSON.stringify(r.ingredients), r.instructions, r.prep_time, r.difficulty, JSON.stringify(r.tags));
      inserted++;
    }
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }

  console.log(`Seeded ${inserted} saladas recipes (${skipped} skipped as duplicates).`);
}

seedSaladasRecipes();
