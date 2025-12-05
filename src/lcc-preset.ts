import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';

const LccPreset = definePreset(Aura, {
  semantic: {
    primary: {
      50: '#e0f7fa',
      100: '#b2f1ef',
      200: '#7de3e0',
      300: '#4ad3d0',
      400: '#22c3c0',
      500: '#00bbb8',
      600: '#00a19e',
      700: '#008f8c',
      800: '#007c79',
      900: '#006b68',
      950: '#00435d'
    },
    colorScheme: {
      dark: {
        surface: { }
      }
    }
  },
  components: {
    menubar: {
      root: {
        background: '{primary.600}',
        color: '#ffffff',
        borderColor: 'transparent'
      },
      item: {
        color: '#ffffff',
        focusBackground: '{primary.700}'
      }
    }
  }
});

export default LccPreset;
