const express = require('express');
const router = express.Router();

// Le module multer sert à gérer les téléversements (upload) de fichiers
const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const HttpError = require("../HttpError");

const productQueries = require("../queries/ProductQueries");

const passport = require('passport');

// GET de la liste des produits
// (Ne requiert pas d'authentification)
router.get('/', (req, res, next) => {
    productQueries.getAllProducts().then(products => {
        res.json(products);
    }).catch(err => {
        return next(err);
    });
});


// GET d'un produit individuel
// (Ne requiert pas d'authentification)
router.get('/:id', (req, res, next) => {
    const id = req.params.id;
    console.log("id:", id);
    productQueries.getProductById(id).then(product => {
        if (product) {
            res.json(product);
        } else {
            return next(new HttpError(404, `Produit ${id} introuvable`));
        }
    }).catch(err => {
        return next(err);
    });
});

const onePixelTransparentPngImage = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAAXNSR0IArs4c6QAAAA1JREFUGFdj+P///38ACfsD/QVDRcoAAAAASUVORK5CYII=", "base64");

// GET de l'image d'un produit
// (Ne requiert pas d'authentification)
router.get('/:id/image', (req, res, next) => {
    const id = req.params.id;
    console.log("id:", id);
    productQueries.getProductImageContent(id).then(imageInfo => {
        if (imageInfo && imageInfo.imageContent) {
            if (imageInfo.imageContentType) {
                res.header('Content-Type', imageInfo.imageContentType);
            }
            res.send(imageInfo.imageContent);
        } else {
            // Si le produit n'a pas d'image, on va retourner une image transparente de 1 pixel
            // afin d'éviter d'avoir une image brisée dans le front-end
            res.header('Content-Type', 'image/png');
            res.send(onePixelTransparentPngImage);
        }
    }).catch(err => {
        return next(err);
    });
});


// POST pour ajout d'un nouveau produit
// ** Exercice 1.3 **
//
// Cette méthode doit être sécurisée par authentification. Importez le module "passport"
// afin d'avoir accès aux fonctionnalités d'authentification, puis faites appel à la fonction
// middleware authenticate(...), de manière similaire à la route "/login", afin d'exiger
// une authentification pour cette route.
// Pour ajouter un nouveau produit, on doit être administrateur. L'appel de cette route
// devrait donc résulter en un statut HTTP 403 Forbidden si le compte authentifié est
// un client normal (et aucun ajout de produit ne doit avoir lieu dans ce cas).
// On peut utiliser la propriété req.user pour obtenir les informations du compte authentifié.
//
// Au besoin, référez-vous au module listeDifussionRouter.js dans l'exemple de code du cours 19.
router.post('/',
    (req, res, next) => {
        const id = req.body.id;
        if (!id || id === '') {
            // Le return fait en sorte qu'on n'exécutera pas le reste de la fonction
            // après l'appel à next(...).
            return next(new HttpError(400, 'Le champ id est requis'));
        }

        productQueries.getProductById(id).then(product => {
            if (product) {
                throw new HttpError(400, `Un produit avec l'id ${id} existe déjà`);
            }

            const newProduct = {
                id: "" + id,
                name: "" + req.body.name,
                price: + req.body.price,
                desc: "" + req.body.desc,
                image: "" + req.body.image,
                longDesc: "" + req.body.longDesc
            };

            return productQueries.insertProduct(newProduct);
        }).then(result => {
            res.json(result);
        }).catch(err => {
            next(err);
        });

    });

// PUT pour la modification d'un produit
// ** Exercice 1.3 **
// Approche similaire que pour le POST ci-haut. La modification d'un produit
// doit être refusée pour les comptes non-administrateurs (avec un statut HTTP 403).
router.put('/:id',
    passport.authenticate('basic', { session: false }),
    (req, res, next) => {
        const id = req.params.id;
        if (!id || id === '') {
            return next(new HttpError(400, 'Le paramètre id est requis'));
        }

        if (id !== req.body.id) {
            return next(new HttpError(400, `Le paramètre spécifie l'id ${id} alors que le produit fourni a l'id ${req.body.id}`));
        }

        const newProduct = {
            id: "" + id,
            name: "" + req.body.name,
            price: + req.body.price,
            desc: "" + req.body.desc,
            image: "" + req.body.image,
            longDesc: "" + req.body.longDesc
        };

        productQueries.updateProduct(newProduct).then(result => {
            if (!result) {
                return next(new HttpError(404, `Produit ${id} introuvable`));
            }

            res.json(result);
        }).catch(err => {
            return next(err);
        });

    });


// DELETE pour le retrait d'un produit (pas utilisé par le front-end actuel)
// ** Exercice 1.3 **
// Approche similaire que pour le POST ci-haut. Le retrait d'un produit
// doit être refusée pour les comptes non-administrateurs (avec un statut HTTP 403).
router.delete('/:id',
    passport.authenticate('basic', { session: false }),
    (req, res, next) => {
        const id = req.params.id;
        if (!id || id === '') {
            return next(new HttpError(400, 'Le paramètre id est requis'));
        }

        productQueries.deleteProduct(id).then(result => {
            if (!result) {
                return next(new HttpError(404, `Produit ${id} introuvable`));
            }

            res.json(result);
        }).catch(err => {
            return next(err);
        });
    });

// POST de l'image d'un produit
// ** Exercice 1.3 **
// Approche similaire que pour le POST ci-haut. Le changement d'image d'un produit
// doit être refusé pour les comptes non-administrateurs (avec un statut HTTP 403).
router.post('/:id/image',
    // Fonction middleware de multer pour gérer l'upload d'un fichier dans ce endpoint.
    // Cet appel de middleware doit venir après celui de l'authentification.
    upload.single('product-image'), // doit correspondre à l'id du champ dans le formulaire html
    passport.authenticate('basic', { session: false }),
    (req, res, next) => {
        const id = req.params.id;
        if (!id || id === '') {
            // Le return fait en sorte qu'on n'exécutera pas le reste de la fonction
            // après l'appel à next(...).
            return next(new HttpError(400, 'Le champ id est requis'));
        }

        productQueries.getProductById(id).then(product => {
            if (!product) {
                throw new HttpError(404, `Produit id ${id} introuvable`);
            }

            // Le middleware upload.single(...) rendra accessible le contenu binaire du fichier
            // téléversé dans req.file.buffer et le type de fichier (p.ex. "image/jpeg")
            // dans req.file.mimetype:
            return productQueries.updateProductImage(id, req.file.buffer, req.file.mimetype);
        }).then(imageInfo => {
            res.send("");
        }).catch(err => {
            next(err);
        });

    });

module.exports = router;
