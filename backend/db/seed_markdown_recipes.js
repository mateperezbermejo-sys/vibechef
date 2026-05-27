const { getDb } = require('./database');

// 63 recipes from Recetario_para_ClaudeCode.md
// Ingredients normalized to English canonical names for ingredient-matching
const MARKDOWN_RECIPES = [
  {
    name: 'Salmorejo',
    ingredients: ['bread', 'garlic', 'tomato', 'olive oil'],
    instructions: 'Escaldar los tomates en agua hirviendo, pasar a agua con hielo y pelarlos. Triturar los tomates, los ajos y la sal hasta obtener una crema fina. Añadir el pan y el vinagre y seguir triturando. Ir echando el aceite poco a poco mientras se sigue triturando. Rectificar de sal. Dejar enfriar en el frigorífico.',
    prep_time: 20, difficulty: 'easy',
    tags: ['vegetarian', 'quick', 'spanish', 'healthy'],
  },
  {
    name: 'Crema de melón con jamón',
    ingredients: ['egg', 'lemon'],
    instructions: 'Cortar el melón, sacar la pulpa y pasarla por la batidora con el yogur, un chorrito de limón, sal y pimienta. Dejar enfriar en la nevera al menos 2 horas. Servir con jamón y huevos cocidos picados por encima.',
    prep_time: 15, difficulty: 'easy',
    tags: ['quick', 'spanish'],
  },
  {
    name: 'Crema verde',
    ingredients: ['broccoli'],
    instructions: 'Lavar el brócoli y quitar el tallo duro. Quitar la cáscara del melón. Lavar las uvas. Triturar todo un par de minutos y salpimentar al gusto. Servir bien frío.',
    prep_time: 10, difficulty: 'easy',
    tags: ['vegetarian', 'vegan', 'quick', 'healthy'],
  },
  {
    name: 'Crema de aguacate y yogur',
    ingredients: ['tomato', 'onion', 'lemon', 'olive oil'],
    instructions: 'Pelar y vaciar los aguacates. Exprimir la lima y añadirla al aguacate. Añadir el yogur y salpimentar. Triturar e ir añadiendo el caldo de verduras. Distribuir en cuencos, picar el tomate y la cebolla y añadir encima. Servir frío con crackers.',
    prep_time: 15, difficulty: 'easy',
    tags: ['vegetarian', 'quick', 'healthy'],
  },
  {
    name: 'Paté marinero',
    ingredients: ['tuna', 'cheese'],
    instructions: 'En un vaso alto de batidora vaciar las latas de atún, de caballa y de anchoas. Añadir los quesitos, los pimientos y algo de jugo y la pimienta. Triturar todo muy finamente hasta obtener una crema fina y espesa. Servir con tostadas o crackers.',
    prep_time: 15, difficulty: 'easy',
    tags: ['quick', 'high-protein'],
  },
  {
    name: 'Salpicón de marisco con quinoa',
    ingredients: ['onion', 'garlic', 'pepper', 'olive oil'],
    instructions: 'Hervir la quinoa en agua con sal durante 12-15 minutos. Preparar una vinagreta con aceite, mostaza, vinagre, sal y pimienta. Cortar los pimientos, la cebolla y el ajo a dados pequeños. Saltear la sepia en aceite. Servir con la quinoa de base, el marisco encima y la vinagreta.',
    prep_time: 30, difficulty: 'medium',
    tags: ['high-protein', 'healthy'],
  },
  {
    name: 'Sopa de cebolla',
    ingredients: ['onion', 'bread', 'cheese', 'olive oil'],
    instructions: 'Pochar las cebollas laminadas a fuego lento con romero. Cuando esté pochada, salpimentar y regar con el vino. Incorporar el caldo y cocer 30 minutos. Rociar el pan con aceite, espolvorear con queso rallado y tostar al horno. Servir la sopa en cazuelas individuales con el pan.',
    prep_time: 45, difficulty: 'medium',
    tags: ['vegetarian', 'spanish'],
  },
  {
    name: 'Crema de calabaza a la naranja',
    ingredients: ['carrot', 'orange', 'olive oil'],
    instructions: 'Trocear el puerro y calentar en una olla con aceite. Pelar las zanahorias y cortar a rodajas. Añadir a la olla junto con la calabaza, cúrcuma, nuez moscada y sal. Saltear a fuego medio. Añadir el zumo de naranja y cubrir con agua. Cocer a fuego lento hasta que las verduras estén blandas. Triturar hasta obtener una crema.',
    prep_time: 35, difficulty: 'easy',
    tags: ['vegetarian', 'vegan', 'healthy'],
  },
  {
    name: 'Crema de zanahoria con nata',
    ingredients: ['carrot', 'potato', 'onion', 'milk', 'orange'],
    instructions: 'Lavar y cortar las zanahorias, la cebolla y las patatas. Calentar aceite en una cazuela, agregar la cebolla y luego la patata y la zanahoria. Rehogar unos minutos. Añadir agua hasta cubrir y cocer 20 minutos. Añadir la piel de naranja 5 minutos antes de finalizar. Añadir la nata. Salpimentar y triturar. Servir con comino.',
    prep_time: 30, difficulty: 'easy',
    tags: ['vegetarian', 'healthy'],
  },
  {
    name: 'Empanadillas de atún',
    ingredients: ['egg', 'tuna', 'flour', 'tomato'],
    instructions: 'Pelar los huevos duros y rallarlos. Cortar los pepinillos y las olivas. Mezclar pepinillos, olivas, atún desmenuzado y tomate frito. Salpimentar. Rellenar las empanadillas y sellar los bordes. Freír en aceite o hornear a 180ºC 20 minutos.',
    prep_time: 35, difficulty: 'medium',
    tags: ['spanish', 'high-protein'],
  },
  {
    name: 'Crujientes de pollo',
    ingredients: ['chicken', 'onion', 'garlic', 'egg'],
    instructions: 'Cortar las pechugas a trozos y salpimentar. Dorar el pollo con aceite. Añadir las cebollas en juliana, los ajos enteros pelados, perejil, cilantro, cúrcuma, comino y canela. Cocinar a fuego lento 45 minutos. Separar el caldo y añadir huevos batidos para espesar. Desmenuzar el pollo y mezclar con la masa de huevos. Rellenar tiras de masa brick y hornear a 180ºC 12-15 minutos.',
    prep_time: 75, difficulty: 'hard',
    tags: ['high-protein'],
  },
  {
    name: 'Berenjenas rellenas',
    ingredients: ['cheese', 'tomato', 'onion', 'olive oil'],
    instructions: 'Cortar las berenjenas por la mitad, vaciarlas y picar la pulpa. Pochar las cebollas, añadir la berenjena troceada, el jamón picado y el tomate. Añadir el queso cremoso y mezclar. Rellenar las pieles de berenjena. Espolvorear con queso rallado y gratinar.',
    prep_time: 35, difficulty: 'medium',
    tags: ['vegetarian', 'healthy'],
  },
  {
    name: 'Pollo caramelizado con miel',
    ingredients: ['chicken', 'onion', 'carrot', 'pepper', 'zucchini', 'orange'],
    instructions: 'Cortar las pechugas a tiras. Saltear en sartén caliente. Cuando empiece a dorarse, agregar la miel y la piel de naranja rallada. Caramelizar. Cortar las verduras en tiras y saltear. Agregar el pollo reservado y salpimentar. Cocinar a fuego suave unos minutos.',
    prep_time: 30, difficulty: 'medium',
    tags: ['high-protein', 'spanish'],
  },
  {
    name: 'Pechugas de pollo con champiñones',
    ingredients: ['chicken', 'mushroom', 'flour', 'olive oil'],
    instructions: 'Salpimentar las pechugas, enharinarlas y freírlas en aceite. Reservar. Filetear los champiñones y rehogarlos en el aceite restante. Añadir el vino y dejar evaporar. Añadir el guiso al pollo reservado y el caldo. Cocer a fuego medio 40 minutos. Acompañar con arroz o pasta.',
    prep_time: 50, difficulty: 'medium',
    tags: ['high-protein'],
  },
  {
    name: 'Solomillo con salsa de calabaza',
    ingredients: ['milk', 'onion', 'garlic', 'olive oil'],
    instructions: 'Sofreír la calabaza, la cebolla y el ajo. Añadir la nata, la leche y reducir. Dorar los ajos y los solomillos en otra sartén. Regar con brandy y dejar reducir 20 minutos. Triturar la calabaza en su salsa. Cortar los solomillos a rodajas y servir con la salsa.',
    prep_time: 45, difficulty: 'medium',
    tags: ['high-protein'],
  },
  {
    name: 'Lomo con salsa de almendras',
    ingredients: ['flour', 'milk', 'cheese'],
    instructions: 'Salpimentar y enharinar los escalopines de lomo. Freírlos y colocarlos en una bandeja de horno. Saltear la almendra molida con el tomate frito. Incorporar la leche y ligar formando una salsa. Cubrir la carne con la salsa, espolvorear con queso rallado y gratinar.',
    prep_time: 30, difficulty: 'medium',
    tags: ['high-protein'],
  },
  {
    name: 'Albóndigas con guisantes',
    ingredients: ['beef', 'onion', 'tomato', 'potato'],
    instructions: 'Sofreír las albóndigas enharinadas. Reservar. Sofreír la cebolla, el puerro y el pimiento. Añadir los tomates troceados. Echar las albóndigas, las patatas a dados y los guisantes. Cubrir con caldo y cocer 40 minutos a fuego lento.',
    prep_time: 60, difficulty: 'medium',
    tags: ['high-protein', 'spanish'],
  },
  {
    name: 'Estofado de ternera',
    ingredients: ['beef', 'carrot', 'mushroom', 'onion', 'garlic', 'pepper'],
    instructions: 'Dorar la carne salpimentada y reservar. En el mismo aceite, añadir la cebolla, el pimiento y el ajo y rehogar 10 minutos. Devolver la carne y echar el vino tinto. Dejar evaporar y añadir agua caliente y laurel. Cocer a fuego lento 1,5 horas. Añadir las zanahorias y los champiñones y seguir 30 minutos más.',
    prep_time: 120, difficulty: 'medium',
    tags: ['high-protein', 'spanish'],
  },
  {
    name: 'Escudella de Navidad',
    ingredients: ['beef', 'chicken', 'garlic', 'potato'],
    instructions: 'Trocear y lavar todas las verduras y carnes. Poner a hervir en agua fría 45 minutos. Añadir los garbanzos remojados y la pelota de carne y cocer otros 45 minutos. Añadir la butifarra y cocer 20 minutos más. Separar el caldo y cocer los galets. Servir garbanzos y carnes en una bandeja aparte.',
    prep_time: 120, difficulty: 'hard',
    tags: ['high-protein', 'spanish'],
  },
  {
    name: 'Sopa de gallina con fideos de espelta',
    ingredients: ['chicken', 'pasta'],
    instructions: 'Poner las carnes y las verduras a hervir en agua fría con sal. Cocer a fuego medio-alto 1h 30 min. Desespumar las impurezas. Retirar la gallina y el jamón y cortarlos. Colar el caldo y poner a hervir otra vez, echar los fideos y cocer 4 minutos. Servir la sopa con los trozos de carne.',
    prep_time: 100, difficulty: 'medium',
    tags: ['high-protein', 'spanish'],
  },
  {
    name: 'Cuscús con aguacate y pistachos',
    ingredients: ['tomato', 'onion', 'lemon', 'butter', 'olive oil'],
    instructions: 'Añadir a la sémola sal, pimienta y un vaso de agua hirviendo. Tapar y dejar cocer 10 minutos. Añadir mantequilla y remover. Mezclar con el aguacate y el tomate en dados y la cebolleta picada. Regar con aceite y limón. Espolvorear con perejil, cilantro y pistachos.',
    prep_time: 20, difficulty: 'easy',
    tags: ['vegetarian', 'quick', 'healthy'],
  },
  {
    name: 'Arroz negro',
    ingredients: ['rice', 'onion', 'garlic', 'tomato', 'olive oil'],
    instructions: 'Saltear las gambas y reservar. Sofreír la cebolla y los ajos. Agregar los calamares y el tomate rallado. Añadir la ñora, el pimentón y la tinta de calamar. Añadir el caldo de pescado. Cuando hierva, cocer 10-12 minutos. Incorporar el arroz y cocer 5 minutos a fuego fuerte y 15 a fuego medio.',
    prep_time: 40, difficulty: 'medium',
    tags: ['spanish'],
  },
  {
    name: 'Guiso de lentejas rojas',
    ingredients: ['tomato', 'carrot', 'onion', 'garlic', 'pepper', 'milk'],
    instructions: 'Calentar aceite y sofreír el ajo y la cebolla. Incorporar los tomates rallados y los pimientos. Añadir las zanahorias y el boniato. Agregar las lentejas rojas y las especias. Añadir el caldo de verduras y cocer media hora. Incorporar la leche de coco y cocer 5 minutos más.',
    prep_time: 45, difficulty: 'easy',
    tags: ['vegetarian', 'healthy', 'high-protein'],
  },
  {
    name: 'Guiso de judías blancas con arroz',
    ingredients: ['spinach', 'potato', 'rice', 'onion', 'garlic', 'tomato'],
    instructions: 'Escurrir las judías blancas y cocer con la carne y los nabos. Sofreír la cebolla y el ajo, añadir el tomate rallado y el pimentón. Incorporar el sofrito al potaje. Agregar las patatas. Cuando hierva añadir el arroz y cocer 15 minutos. Servir con huevo duro rallado.',
    prep_time: 45, difficulty: 'medium',
    tags: ['vegetarian', 'healthy', 'high-protein'],
  },
  {
    name: 'Salmón con manzanas',
    ingredients: ['salmon', 'apple', 'olive oil'],
    instructions: 'Precalentar el horno a 190ºC. Partir las manzanas por la mitad y cortar en láminas. Cubrir una bandeja con manzanas. Poner los lomos de salmón salpimentados encima y cubrir con otra capa de manzanas. Cocer 35 minutos hasta que caramelice y acabar con unos minutos de gratinado.',
    prep_time: 40, difficulty: 'easy',
    tags: ['high-protein', 'healthy'],
  },
  {
    name: 'Conchas de pescado',
    ingredients: ['flour', 'butter', 'milk', 'egg', 'cheese'],
    instructions: 'Cocer el pescado limpio de pieles y espinas al vapor. Triturarlo y salpimentar. Hacer una bechamel con mantequilla, harina y leche. Añadir tres yemas de huevo, remover bien y mezclar con el pescado. Rellenar conchas de vieiras o cazuelas, cubrir de queso rallado y gratinar.',
    prep_time: 30, difficulty: 'medium',
    tags: ['high-protein'],
  },
  {
    name: 'Bonito en sanfaina',
    ingredients: ['tuna', 'zucchini', 'onion', 'garlic', 'pepper', 'tomato', 'olive oil'],
    instructions: 'Cortar el bonito a dados, salpimentar y pasar por la sartén. Reservar. Sofreír los ajos y los pimientos. Añadir la cebolla, la berenjena y el calabacín. Añadir el tomate rallado, el laurel y el azúcar. Cocinar 30 minutos. Añadir el pescado y cocer 5 minutos más.',
    prep_time: 45, difficulty: 'medium',
    tags: ['high-protein', 'healthy'],
  },
  {
    name: 'Atún escabechado',
    ingredients: ['tuna', 'onion', 'garlic', 'carrot', 'olive oil'],
    instructions: 'Salar el atún en dados y saltear vuelta y vuelta. Reservar. Confitar los ajos sin pelar en aceite. Añadir las cebollas laminadas y la zanahoria en bastoncillos. Incorporar el vino, el vinagre, el comino, el laurel, el tomillo y pimienta en grano. Cocer 10 minutos. Añadir el atún fuera del fuego.',
    prep_time: 25, difficulty: 'easy',
    tags: ['high-protein', 'healthy'],
  },
  {
    name: 'Hamburguesas de merluza y gambas',
    ingredients: ['egg', 'flour', 'onion', 'garlic'],
    instructions: 'Descongelar la merluza y secarla bien. Triturar con la cebolla, el ajo, el perejil, el huevo y el pan rallado. Añadir las gambas a trozos y remover. Reposar 1h en la nevera. Dar forma de hamburguesa y cocinar en sartén antiadherente a fuego medio.',
    prep_time: 30, difficulty: 'medium',
    tags: ['high-protein'],
  },
  {
    name: 'Bacalao confitado con calabaza y queso',
    ingredients: ['cheese', 'garlic', 'olive oil'],
    instructions: 'Sofreír los ajos enteros en aceite abundante y añadir tomillo. Secar los lomos de bacalao y confitar en aceite templado 10 minutos. Cortar la calabaza en láminas rectangulares. Montar un sandwich de calabaza con queso en medio y asar en sartén muy caliente. Servir el bacalao encima.',
    prep_time: 25, difficulty: 'medium',
    tags: ['high-protein'],
  },
  {
    name: 'Bacalao frito con garbanzos y espinacas',
    ingredients: ['spinach', 'onion', 'garlic', 'olive oil'],
    instructions: 'Sofreír la cebolla y el ajo. Añadir las pasas y los piñones. Echar el brandy y dejar evaporar. Incorporar las espinacas frescas y saltear. Añadir los garbanzos cocidos. Confitar el bacalao en aceite y dorar por los dos lados. Servir el bacalao acompañado de los garbanzos y las espinacas.',
    prep_time: 25, difficulty: 'easy',
    tags: ['high-protein', 'healthy'],
  },
  {
    name: 'Buñuelos de bacalao',
    ingredients: ['flour', 'egg', 'onion'],
    instructions: 'Mezclar el bacalao cortado pequeño con la cebolla picada, el ajo y el perejil. Batir los huevos e incorporar la harina con la levadura. Añadir al bacalao. Añadir el azafrán. Ajustar consistencia con harina o cerveza. Reposar 30 minutos en la nevera. Freír pequeñas porciones en aceite abundante hasta que se doren.',
    prep_time: 45, difficulty: 'medium',
    tags: ['spanish', 'high-protein'],
  },
  {
    name: 'Caldo vegetal',
    ingredients: ['potato', 'onion', 'garlic'],
    instructions: 'Pelar y lavar todas las verduras: puerro, apio, cebolla, nabo, chirivía, alcachofa, perejil, ajo y patata. Poner a hervir en una olla con agua 3 litros. Llevar a ebullición y cocer a fuego medio 40 minutos. Colar el caldo y conservar en botes de cristal.',
    prep_time: 50, difficulty: 'easy',
    tags: ['vegetarian', 'vegan', 'healthy'],
  },
  {
    name: 'Hummus de berenjena',
    ingredients: ['garlic', 'lemon', 'olive oil'],
    instructions: 'Cortar las berenjenas por la mitad y asarlas en parrilla o sartén cubiertas con papel de aluminio 30-40 minutos. Sacar la pulpa. Triturar la pulpa de berenjena, el ajo, el tahini y el zumo de limón. Salpimentar, añadir el perejil picado y el comino. Rociar con aceite de oliva y espolvorear de pimentón.',
    prep_time: 45, difficulty: 'easy',
    tags: ['vegetarian', 'vegan', 'healthy'],
  },
  {
    name: 'Flan de berenjena asada',
    ingredients: ['egg', 'milk'],
    instructions: 'Asar las berenjenas en el horno a 180ºC una hora. Pelarlas y triturarlas con la nata, el aceite y el caldo de ave. Colar y añadir las yemas y las claras de huevo. Disolver la gelatina previamente hidratada en parte de la crema caliente y mezclar con el resto. Cocinar en moldes al baño María o en horno de vapor a 85ºC 15 minutos.',
    prep_time: 80, difficulty: 'hard',
    tags: ['vegetarian'],
  },
  {
    name: 'Tortilla de patata rellena de jamón y queso',
    ingredients: ['potato', 'egg', 'onion', 'cheese'],
    instructions: 'Pelar y cortar las patatas en rodajas finas. Freírlas en aceite hasta que estén cocidas. En un bol, batir los huevos y añadir las patatas. Añadir la mitad de la mezcla en la sartén. Colocar el jamón y el queso por capas. Cubrir con el resto de la mezcla y cuajar la tortilla dándole la vuelta.',
    prep_time: 30, difficulty: 'medium',
    tags: ['high-protein', 'spanish'],
  },
  {
    name: 'Tortilla de patata sin huevos',
    ingredients: ['potato', 'zucchini', 'onion', 'garlic', 'flour'],
    instructions: 'Freír las patatas en rodajas finas. Picar el calabacín, la cebolla y el ajo y añadir a las patatas. Cuando esté bien cocinado, escurrir el exceso de aceite y reservar. Hacer una pasta ligera con la harina de garbanzos y la sal. Añadir las verduras y cuajar en sartén ligeramente engrasada a fuego suave.',
    prep_time: 30, difficulty: 'medium',
    tags: ['vegetarian', 'vegan', 'spanish'],
  },
  {
    name: 'Tortitas de calabacín con salsa de yogur',
    ingredients: ['zucchini', 'flour', 'cheese', 'lemon'],
    instructions: 'Lavar y rallar los calabacines. Escurrir con sal. Añadir el huevo batido, la harina, el parmesano y la levadura. Formar una masa y refrigerar 1 hora. Hacer tortitas en sartén con aceite a fuego medio-bajo. Para la salsa: batir yogur, mayonesa, ajo picado, zumo y ralladura de limón, comino, aceite y hierbas.',
    prep_time: 30, difficulty: 'easy',
    tags: ['vegetarian', 'healthy'],
  },
  {
    name: 'Puré de patatas con quinoa',
    ingredients: ['potato', 'zucchini', 'onion', 'milk', 'butter'],
    instructions: 'Lavar y hervir la quinoa con sal 20 minutos. Hervir las patatas con el calabacín y la cebolla. Reservar parte del caldo. Hacer un puré junto con la quinoa añadiendo margarina, un chorrito de leche vegetal y parte del caldo hasta obtener una consistencia cremosa.',
    prep_time: 30, difficulty: 'easy',
    tags: ['vegetarian', 'healthy'],
  },
  {
    name: 'Mijo con acelgas y calabaza',
    ingredients: ['onion', 'olive oil', 'milk'],
    instructions: 'Cortar la cebolla, las acelgas y la calabaza en trozos pequeños. Sofreír la cebolla. Agregar las acelgas y la calabaza. Sofreír 10-15 minutos. Echar el vino y dejar evaporar. Añadir el caldo y la leche vegetal. Cuando hierva, poner el mijo y cocer 20 minutos.',
    prep_time: 35, difficulty: 'easy',
    tags: ['vegetarian', 'vegan', 'healthy'],
  },
  {
    name: 'Crema de castaña',
    ingredients: ['apple', 'milk'],
    instructions: 'Cocer las castañas asadas y peladas junto con el azúcar, la leche, la manzana pelada y troceada y la vainilla 30 minutos. Cuando las castañas estén tiernas, triturar hasta obtener una crema suave y espesa.',
    prep_time: 40, difficulty: 'easy',
    tags: ['vegetarian', 'dessert'],
  },
  {
    name: 'Remolacha asada con yogur griego',
    ingredients: ['lemon', 'olive oil'],
    instructions: 'Precalentar el horno a 200ºC. Pelar la remolacha, cortar a trozos, salpimentar y rociar con aceite. Hornear 40 minutos. Triturar la remolacha y añadir el yogur griego, la ralladura de limón y el zumo. Aliñar con aceite.',
    prep_time: 55, difficulty: 'easy',
    tags: ['vegetarian', 'healthy'],
  },
  {
    name: 'Queso con dulce de membrillo casero',
    ingredients: ['cheese', 'milk'],
    instructions: 'Para el membrillo: cocer los membrillos pelados cubiertos de agua 45 minutos. Pesar la pulpa y añadir su mismo peso de azúcar menos 200g. Cocer con jugo de limón 50 minutos removiendo frecuentemente. Para la crema de queso: triturar el queso cremoso con la nata y el azúcar. Calentar y añadir la gelatina. Rellenar vasos y enfriar. Cubrir con crema de membrillo.',
    prep_time: 90, difficulty: 'hard',
    tags: ['vegetarian', 'dessert'],
  },
  {
    name: 'Crema de arroz con leche',
    ingredients: ['milk', 'rice', 'lemon'],
    instructions: 'Poner a hervir la leche con la cáscara de limón y la rama de canela. Añadir el arroz y cocer 30 minutos a fuego suave. Añadir el azúcar y cocer 15 minutos más. Colar y separar el arroz de la leche. Triturar el arroz con un poco de leche. Montar el resto de la leche con nata y canela. Servir la crema de arroz con espuma de leche encima.',
    prep_time: 55, difficulty: 'easy',
    tags: ['vegetarian', 'dessert'],
  },
  {
    name: 'Mousse de turrón',
    ingredients: ['milk'],
    instructions: 'Trocear el turrón y triturar con un chorrito de leche para obtener una masa fina. Montar la nata líquida en un bol. Añadir la nata montada al turrón con movimientos envolventes. Servir en pequeños recipientes y reservar en la nevera.',
    prep_time: 20, difficulty: 'easy',
    tags: ['vegetarian', 'quick', 'dessert'],
  },
  {
    name: 'Tarta de Queso',
    ingredients: ['cheese', 'egg', 'milk'],
    instructions: 'Precalentar el horno a 175ºC. Batir los huevos con el azúcar. Añadir la vainilla, la maizena y la nata líquida. Integrar el queso Quark con movimientos envolventes. Hornear en molde con papel vegetal durante 40 minutos.',
    prep_time: 55, difficulty: 'medium',
    tags: ['vegetarian', 'dessert'],
  },
  {
    name: 'Pastel de limón',
    ingredients: ['cheese', 'milk', 'egg', 'lemon', 'butter'],
    instructions: 'Precalentar el horno a 180ºC. Triturar las galletas y mezclar con mantequilla fundida. Cubrir la base del molde y congelar 10-15 minutos. Mezclar en batidora el queso cremoso, la leche, los huevos, la maizena, el yogur de limón, la ralladura y el azúcar. Hornear 30 minutos.',
    prep_time: 50, difficulty: 'medium',
    tags: ['vegetarian', 'dessert'],
  },
  {
    name: 'Buñuelos de cuaresma',
    ingredients: ['milk', 'flour', 'butter', 'egg', 'lemon'],
    instructions: 'Calentar la leche con la mantequilla, la sal y la piel de limón rallada. Tirar la harina de golpe y remover hasta que se despegue de las paredes. Dejar templar. Añadir los huevos de uno en uno. Freír pequeñas bolas en aceite caliente hasta dorar. Espolvorear con azúcar.',
    prep_time: 40, difficulty: 'medium',
    tags: ['vegetarian', 'dessert', 'spanish'],
  },
  {
    name: 'Gelatina de mojito',
    ingredients: ['lemon'],
    instructions: 'Poner a hervir el agua, el jugo de lima y la menta 5 minutos. Colar y dejar enfriar. Disolver el agar agar y llevar a ebullición 3 minutos. Añadir colorante verde. Rellenar vasitos de chupito y adornar con menta. Refrigerar.',
    prep_time: 20, difficulty: 'easy',
    tags: ['vegetarian', 'vegan', 'quick', 'dessert'],
  },
  {
    name: 'Gelatina de naranja',
    ingredients: ['orange'],
    instructions: 'Cubrir las láminas de gelatina en agua fría 15 minutos. Exprimir las naranjas. Calentar el zumo de naranja y disolver el azúcar. Añadir las hojas de gelatina escurridas y remover. Dejar enfriar 30 minutos. Verter dentro de las medias naranjas y enfriar varias horas.',
    prep_time: 20, difficulty: 'easy',
    tags: ['vegetarian', 'vegan', 'quick', 'dessert'],
  },
  {
    name: 'Espuma de manzana',
    ingredients: ['apple', 'egg'],
    instructions: 'Cocer las manzanas troceadas con agua, limón, azúcar y canela 12 minutos. Triturar y dejar enfriar. Montar las claras a punto de nieve. Mezclar el yogur con la manzana triturada y añadir las claras con movimientos envolventes. Verter en copas y refrigerar al menos 2-3 horas.',
    prep_time: 25, difficulty: 'easy',
    tags: ['vegetarian', 'dessert'],
  },
  {
    name: 'Kéfir con fresas y semillas de amapola',
    ingredients: ['milk'],
    instructions: 'Lavar las fresas, quitar la parte verde y trocearlas. Triturar hasta formar un puré fino. Añadir el kéfir y el azúcar y remover bien. Servir en copas de postre y espolvorear con semillas de amapola.',
    prep_time: 10, difficulty: 'easy',
    tags: ['vegetarian', 'quick', 'healthy', 'dessert'],
  },
  {
    name: 'Pudin de pera y plátano',
    ingredients: ['banana', 'milk', 'egg', 'butter'],
    instructions: 'Precalentar el horno a 165ºC. Pelar y cortar la fruta a dados y añadir zumo de limón. Triturar los huevos con la leche, el azúcar y las ensaimadas. Incorporar la fruta y mezclar. Cubrir un molde de caramelo líquido. Cocer al baño María 40 minutos.',
    prep_time: 55, difficulty: 'medium',
    tags: ['vegetarian', 'dessert'],
  },
  {
    name: 'Mousse de aguacate y chocolate',
    ingredients: ['milk'],
    instructions: 'Pelar y trocear los aguacates. Triturar con el queso crema, el cacao puro, la estevia, la vainilla y la sal. Aligerar con bebida de avena. Repartir la mousse en copas y dejar reposar 2 horas en el frigorífico.',
    prep_time: 15, difficulty: 'easy',
    tags: ['vegetarian', 'quick', 'dessert'],
  },
  {
    name: 'Coulant de chocolate',
    ingredients: ['egg', 'butter', 'flour'],
    instructions: 'Precalentar el horno a 200ºC. Fundir el chocolate con la mantequilla al baño María. Mezclar el azúcar, los huevos y las yemas. Añadir el chocolate fundido y la harina tamizada. Verter en moldes untados de mantequilla. Hornear 5-10 minutos para que el exterior esté hecho y el centro líquido.',
    prep_time: 20, difficulty: 'medium',
    tags: ['vegetarian', 'dessert'],
  },
  {
    name: 'Rocas de chocolate',
    ingredients: ['butter'],
    instructions: 'Fundir el chocolate al baño María o en el microondas. Trocear o picar los frutos secos y las pasas. Añadir todo al chocolate y remover. Con dos cucharitas, formar pequeños montoncitos en papel vegetal. Enfriar 30 minutos en la nevera.',
    prep_time: 20, difficulty: 'easy',
    tags: ['vegetarian', 'quick', 'dessert'],
  },
  {
    name: 'Batido de plátano y nueces con soja',
    ingredients: ['banana', 'milk'],
    instructions: 'Poner todos los ingredientes en la batidora y triturar muy fino. Servir frío.',
    prep_time: 5, difficulty: 'easy',
    tags: ['vegetarian', 'vegan', 'quick', 'healthy'],
  },
  {
    name: 'Mantequilla de coco',
    ingredients: ['butter'],
    instructions: 'Triturar muy bien varias veces el coco rallado con la sal y el aceite de coco hasta conseguir una pasta fina y uniforme. Calentar unos segundos en el microondas antes de usar.',
    prep_time: 10, difficulty: 'easy',
    tags: ['vegetarian', 'vegan', 'quick'],
  },
  {
    name: 'Delicias de frutas rojas',
    ingredients: ['egg', 'lemon'],
    instructions: 'Descongelar las frutas rojas sobre un colador. Triturar las frutas con el yogur y la mitad del azúcar. Calentar parte del zumo de limón y disolver la gelatina. Añadir al puré. Montar las claras a punto de nieve con el azúcar restante. Incorporar con movimientos envolventes. Enfriar en la nevera 4-5 horas.',
    prep_time: 30, difficulty: 'medium',
    tags: ['vegetarian', 'dessert'],
  },
  {
    name: 'Manzanas asadas',
    ingredients: ['apple', 'banana'],
    instructions: 'Precalentar el horno a 200ºC. Lavar las manzanas y retirar el corazón. Picar los frutos secos, cortar las pasas y los plátanos. Rellenar las manzanas. Espolvorear con azúcar, canela y moscatel. Tapar con papel de aluminio y hornear 35 minutos.',
    prep_time: 40, difficulty: 'easy',
    tags: ['vegetarian', 'vegan', 'dessert'],
  },
  {
    name: 'Panecillos dulces',
    ingredients: ['egg', 'flour', 'butter'],
    instructions: 'Mezclar los huevos con el azúcar blanco y moreno, el aceite, la miel y la vainilla. Añadir los frutos secos. Incorporar la harina y la levadura. Formar una bola y reposar 30 minutos. Hacer bolas aplastadas, pintarlas con huevo y café soluble, cubrir con sésamo. Hornear a 180ºC 15-20 minutos.',
    prep_time: 45, difficulty: 'medium',
    tags: ['vegetarian', 'dessert'],
  },
  {
    name: 'Papaya con crema de almendras',
    ingredients: ['milk'],
    instructions: 'Pelar la papaya y vaciar las semillas. Añadir la papaya cortada, la crema de almendras, la leche de almendras, el jengibre y la pimienta. Triturar todo muy bien hasta conseguir una textura ligera.',
    prep_time: 10, difficulty: 'easy',
    tags: ['vegetarian', 'vegan', 'quick', 'healthy'],
  },
  {
    name: 'Galletas de boniato',
    ingredients: ['egg', 'flour'],
    instructions: 'Aplastar el boniato asado con un tenedor. Añadir el aceite, el huevo, el azúcar moreno y el jengibre. Incorporar la harina y la levadura. Añadir las pepitas de chocolate. Formar bolas y aplastarlas. Hornear a 180ºC 15-20 minutos.',
    prep_time: 40, difficulty: 'easy',
    tags: ['vegetarian', 'dessert'],
  },
];

function seedMarkdownRecipes() {
  const db = getDb();

  // Idempotency guard: skip if markdown recipes already exist
  const existing = db.prepare("SELECT COUNT(*) as n FROM recipes WHERE source = 'markdown'").get();
  if (existing.n > 0) {
    console.log(`Markdown recipes already seeded (${existing.n} found). Skipping.`);
    return;
  }

  const insert = db.prepare(
    `INSERT INTO recipes (name, ingredients, instructions, prep_time, difficulty, tags, source)
     VALUES (?, ?, ?, ?, ?, ?, 'markdown')`
  );

  let inserted = 0;
  db.exec('BEGIN');
  try {
    for (const r of MARKDOWN_RECIPES) {
      // Skip if a recipe with the same name already exists (e.g. Crema de zanahoria from seed.js)
      const dup = db.prepare('SELECT id FROM recipes WHERE name = ?').get(r.name);
      if (dup) continue;
      insert.run(r.name, JSON.stringify(r.ingredients), r.instructions, r.prep_time, r.difficulty, JSON.stringify(r.tags));
      inserted++;
    }
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }

  console.log(`Seeded ${inserted} markdown recipes (${MARKDOWN_RECIPES.length - inserted} skipped as duplicates).`);
}

seedMarkdownRecipes();
