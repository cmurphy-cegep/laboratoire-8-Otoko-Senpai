const express = require('express');
const router = express.Router();

const HttpError = require("../HttpError");

const productQueries = require("../queries/ProductQueries");
const cartQueries = require("../queries/CartQueries");

const passport = require('passport');

// ** Exercice 1.4 **
// Activer l'authentification pour toutes les routes (chemins d'URL) servis par cet 
// objet routeur. On peut faire cela au niveau de l'objet router, car aucune route
// gérée par celui-ci ne doit être accessible publiquement.
// Référez-vous au besoin au module contactRouter.js dans les exemples du cours 19.


router.get('/:userId', (req, res, next) => {
    try {
        if (!req.params.userId || req.params.userId === '') {
            throw new HttpError(400, "Le paramètre userId doit être spécifié");
        }

        // ** Exercice 1.4 **
        // Il faut valider si le compte authentifié essaie d'accéder à son propre panier.
        // Pour cela, on peut comparer l'identifiant du compte (req.user.userAccountId)
        // avec le paramètre de route :userId. S'ils sont les mêmes, c'est que l'utilisateur
        // ou utilisatrice tente d'accéder à son propre panier, donc c'est permis.
        // Aussi, tout compte adminstrateur (req.user.isAdmin === true) a le droit d'accéder
        // au panier de n'importe quel utilisateur.
        // À part ces deux cas énoncés, toute tentative d'accès à un panier d'autrui doit
        // être refusée en retournant un statut HTTP 403 Forbidden. Vous pouvez utiliser
        // la classe d'exception HttpError pour passer les informations de l'erreur au gestionnaire
        // d'erreur (via next(...)).
        //
        // Conseil: il peut s'avérer judicieux d'extraire la logique de validation pour l'autorisation
        // d'accès au panier dans une fonction à part, car la même logique s'appliquera pour les routes
        // PUT et DELETE liées au panier.


        cartQueries.getCurrentCartByUserId(req.params.userId).then(cart => {
            res.json(cart);
        }).catch(err => {
            return next(err);
        });
    } catch (err) {
        return next(err);
    }
});


router.put('/:userId/:productId',passport.authenticate('basic', { session: false }), (req, res, next) => {
    
    try {
        if (!req.params.userId || req.params.userId === '') {
            throw new HttpError(400, "Le paramètre userId doit être spécifié");
        }

        // ** Exercice 1.4 **
        // La même logique d'autorisation que pour le GET d'un panier s'applique ici :
        // - Un utilisateur non-administrateur ne peut modifier que son propre panier
        // - Un utilisateur administrateur peut modifier n'importe quel panier

        if (!req.params.productId || req.params.productId === '') {
            throw new HttpError(400, "Le paramètre productId doit être spécifié");
        }

        const userId = "" + req.params.userId;
        const productId = "" + req.params.productId;

        productQueries.getProductById(productId).then(product => {
            if (!product) {
                throw new HttpError(404, `Le produit ${productId} est introuvable`);
            }

            return cartQueries.updateCurrentCartEntry(userId, product.id, req.body.quantity);
        }).then(cartItem => {
            res.json(cartItem);
        }).catch(err => {
            return next(err);
        });
    } catch (error) {
        return next(error);
    }
});

// DELETE pour enlever un article d'un panier d'un client
router.delete('/:userId/:productId',passport.authenticate('basic', { session: false }), (req, res, next) => {
    try {
        if (!req.params.userId || req.params.userId === '') {
            throw new HttpError(400, "Le paramètre userId doit être spécifié");
        }

        // ** Exercice 1.4 **
        // La même logique d'autorisation que pour le GET d'un panier s'applique ici :
        // - Un utilisateur non-administrateur ne peut modifier que son propre panier
        // - Un utilisateur administrateur peut modifier n'importe quel panier

        if (!req.params.productId || req.params.productId === '') {
            throw new HttpError(400, "Le paramètre productId doit être spécifié");
        }

        const userId = "" + req.params.userId;
        const productId = "" + req.params.productId;

        cartQueries.deleteCurrentCartEntry(userId, productId).then(result => {
            return res.json({});
        }).catch(err => {
            return next(err);
        });
    } catch (error) {
        return next(error);
    }
});


// DELETE pour supprimer le panier au complet pour un client
router.delete('/:userId',passport.authenticate('basic', { session: false }), (req, res, next) => {
    try {
        if (!req.params.userId || req.params.userId === '') {
            throw new HttpError(400, "Le paramètre userId doit être spécifié");
        }

        // ** Exercice 1.4 **
        // La même logique d'autorisation que pour le GET d'un panier s'applique ici :
        // - Un utilisateur non-administrateur ne peut supprimer que son propre panier
        // - Un utilisateur administrateur peut supprimer n'importe quel panier

        const userId = "" + req.params.userId;

        cartQueries.deleteCurrentCart(userId).then(result => {
            return res.json({});
        }).catch(err => {
            return next(err);
        });
    } catch (error) {
        return next(error);
    }
});

module.exports = router;
