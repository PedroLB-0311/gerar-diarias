import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';

if (typeof window !== "undefined") {
  // só roda no navegador
  pdfMake.vfs = pdfFonts?.pdfMake?.vfs || pdfFonts?.vfs;
}

export default pdfMake;
