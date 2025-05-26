const globalCss = {
    h2: {
      marginBottom: 4,
      fontSize: "lg",
      fontWeight: "bold",
    },
    h3: {
      marginBottom: 4,
      fontWeight: "bold",
    },
    ul: {
      marginTop: 4,
      marginBottom: 4,
      listStyleType: "disc",
      paddingLeft: 4,
    },
    ol: {
      marginTop: 4,
      marginBottom: 4,
      listStyleType: "decimal",
      paddingLeft: 4,
    },
    p: {
      marginTop: 4,
      marginBottom: 4,
    },
    "*::placeholder": {
      opacity: 1,
      color: "fg.subtle",
      _dark: {
        color: "gray.400",
      },
    },
    "*::selection": {
      bg: "gray.800",
      color: "blue.200",
      _dark: { bg: "blue.200", color: "gray.800" },
    },
  };

export default globalCss;
  