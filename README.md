# MCPAQL Organization Website

Website for the MCPAQL organization with information about the public specification, implementations, and discussions.

## About MCPAQL

MCPAQL (Model Context Protocol Query Language) is an open specification designed to provide an efficient GraphQL-like syntax for making tool calls to MCP servers and other APIs used by:

- Operating Systems
- Websites
- Applications
- Cloud Services

This open-source specification is designed to work in conjunction with [DollhouseMCP](https://github.com/MCPAQL/DollhouseMCP), utilizing memory and template elements, but may also be implemented separately.

## Website Structure

This is a static GitHub Pages website. All static site files are in the `public/` directory:

- **Home Page** (`public/index.html`) - Overview of MCPAQL specification
- **Styling** (`public/css/style.css`) - Modern, responsive CSS styling

## Deployment

The website is automatically deployed to GitHub Pages when changes are pushed to the `main` branch. The deployment workflow is configured in `.github/workflows/static.yml` and deploys only the `public/` directory to avoid exposing workflow files.

### Local Development

To preview the website locally, you can:

1. Open `public/index.html` directly in your browser
2. Or use a local server:
   ```bash
   # Using Python
   cd public && python -m http.server 8000
   
   # Using Node.js
   npx serve public
   ```

## Contributing

Contributions to the MCPAQL specification and this website are welcome. Please open an issue or submit a pull request.

## License

This project is open source. See the specification documentation for details.
