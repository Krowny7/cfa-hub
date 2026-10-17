// Pour les tests de rendu : tsx compile le JSX à l'ancienne
// (React.createElement), et un composant qui crée du JSX au chargement de
// son module (une table d'icônes) a besoin de React global AVANT d'être
// importé. À importer juste après ./sans-css.
import React from "react";

(globalThis as { React?: typeof React }).React = React;

export {};
