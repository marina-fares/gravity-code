import { createTheme } from '@mui/material/styles';

const theme = createTheme({
    palette: {
      primary: {
        // Purple and green play nicely together.
        main: '#2596be;',
      },
      secondary: {
        // This is green.A700 as hex.
        main: '#BDBDBD;',
      },
    },
  });

export default theme;