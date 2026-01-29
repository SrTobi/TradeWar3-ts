{
  description = "TanStack project development environment";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
      in
      {
        devShells.default = with pkgs; mkShell {
          buildInputs = [
            nodejs_25
            nodePackages.pnpm
            nodePackages.typescript-language-server
            nodePackages.prisma
            openssl.dev
            prisma
            prisma-engines
          ];

          shellHook = ''
            echo "TanStack Dev Environment Loaded"
            echo "Node version: $(node --version)"
            echo "Pnpm version: $(pnpm --version)"
            # Automatically set PATH to use local node_modules binaries
            export PATH="$PWD/node_modules/.bin:$PATH"

            export PKG_CONFIG_PATH="${openssl.dev}/lib/pkgconfig";
            export PRISMA_SCHEMA_ENGINE_BINARY="${prisma-engines}/bin/schema-engine"
            export PRISMA_QUERY_ENGINE_BINARY="${prisma-engines}/bin/query-engine"
            export PRISMA_QUERY_ENGINE_LIBRARY="${prisma-engines}/lib/libquery_engine.node"
            export PRISMA_FMT_BINARY="${prisma-engines}/bin/prisma-fmt"
          '';
        };
      }
    );
}
