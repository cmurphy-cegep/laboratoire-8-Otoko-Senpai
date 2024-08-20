const express = require('express');
const router = express.Router();

const HttpError = require("../HttpError");

const orderQueries = require("../queries/OrderQueries");
const passport = require('passport');

// ** Exercice 1.5 **
// Active l'authentification pour toutes les routes (chemins d'URL) servis par cet 
// objet routeur

// GET pour obtenir toutes les commandes
// ** Exercice 1.5.1 **
// Sécurisez adéquatement cette ressource afin que seuls les comptes administrateur puissent
// y avoir accès. Toute autre tentative de la part d'un compte client normal doit être
// refusée avec un statut HTTP 403 Forbidden.
router.get('/',passport.authenticate('basic', { session: false }), (req, res, next) => {
    orderQueries.getAllOrders().then(orders => {
        res.json(orders);
    }).catch(err => {
        return next(err);
    })
});


// POST pour soumettre une nouvelle commande
router.post('/',passport.authenticate('basic', { session: false }), (req, res, next) => {
    // ** Exercice 1.5.2 **
    // Un utilisateur ne doit pouvoir passer une commande que pour son propre panier. Le corps de la
    // requête HTTP contient le champ userId qui identifie quel est le panier à utiliser pour passer
    // la commande : on doit donc valider que celui-ci correspond à l'identifiant de l'utilisateur
    // authentifié. Si ces deux valeurs ne correspondent pas, c'est que quelqu'un tente de passer
    // une commande avec le panier d'un autre client : on doit donc bloquer cette tentative en
    // retournant un statut HTTP 403 Forbidden !

    orderQueries.placeOrder(req.body).then(order => {
        res.json(order);
    }).catch(err => {
        return next(err);
    })
});

module.exports = router;
