# NatureWATCH

## Installation and Usage

The steps below will walk you through setting up your own instance of the project.

### Install Project Dependencies

To set up the development environment for this website, you'll need to install the following on your system:

- [Node](http://nodejs.org/) (see version in [.nvmrc](./.nvmrc)) (To manage multiple node versions we recommend [nvm](https://github.com/creationix/nvm))
- [pnpm](https://pnpm.io/installation)

### Initialize `.env.local` File

The project uses environment variables, which are set by default in the [.env](.env) file. To customize these variables (e.g., to use a custom database), create a `.env.local` file at the root of the repository (`cp .env.example .env.local`) and modify as needed.

**Required Environment Variables:**

- `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN`: Your Mapbox access token for map tiles

For more detailed instructions on working with environment variables in Next.js, please consult the [Next.js Environment Variables documentation](https://nextjs.org/docs/basic-features/environment-variables).

Note: The `.env.local` file is configured to be ignored by Git to prevent accidental exposure of sensitive information.

### Start local development server

If you use [`nvm`](https://github.com/creationix/nvm), activate the desired Node version:

```sh
nvm install
```

Install Node modules:

```sh
pnpm install
```

Start development server:

```sh
pnpm dev
```

✨ You can now access the app at [http://localhost:3000](http://localhost:3000)

## License

TBD
