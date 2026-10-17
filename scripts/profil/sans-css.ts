// Pour les tests de rendu (react-dom/server) : un module CSS importé par un
// composant rend ses noms de classes tels quels (« s.ligne » → « ligne »),
// sans feuille de style. À importer EN PREMIER dans le test.
require.extensions[".css"] = (m) => {
  m.exports = new Proxy({}, { get: (_cible, cle) => (cle === "__esModule" ? false : String(cle)) });
};

export {};
