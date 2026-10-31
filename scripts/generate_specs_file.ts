import { ALL_ITEMS } from '../src/data/itemsData';
import { buildEspecificacionesAnexo3raWorkbook } from '../src/utils/excelAnexo3ra';
import path from 'path';

async function main() {
  console.log(`Starting generation of ESPECIFICACIONES TECNICAS FINALES IA.xlsx with ${ALL_ITEMS.length} items...`);
  const startTime = Date.now();
  const wb = buildEspecificacionesAnexo3raWorkbook(ALL_ITEMS);
  const outPathIa = path.resolve(process.cwd(), 'public/ESPECIFICACIONES_TECNICAS_FINALES_IA.xlsx');
  const outPathOld = path.resolve(process.cwd(), 'public/ESPECIFICACIONES_TECNICAS_FINALES.xlsx');
  await wb.xlsx.writeFile(outPathIa);
  await wb.xlsx.writeFile(outPathOld);
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`Success! Files written to:\n - ${outPathIa}\n - ${outPathOld}\nin ${duration}s`);
}

main().catch((err) => {
  console.error('Error generating Excel:', err);
  process.exit(1);
});
