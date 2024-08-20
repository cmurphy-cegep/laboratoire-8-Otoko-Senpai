const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const HttpError = require('./HttpError');

const passport = require('passport');
const BasicStrategy = require('passport-http').BasicStrategy;
const crypto = require('crypto');

const userAccountQueries = require("./queries/UserAccountQueries");

const productRouter = require('./routes/productRouter');
const cartRouter = require('./routes/cartRouter');
const orderRouter = require('./routes/orderRouter');

const app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(cookieParser());

// Pour servir les images et autres contenus statiques:
app.use(express.static(path.join(__dirname, 'public')));

// Classe qui surcharge la méthode _challenge() de BasicStrategy
// afin de modifier l'en-tête Www-Authenticate retourné lorsque l'authentification
// basic échoue. Si l'en-tête comporte la chaîne "Basic realm="..."", le comportement
// des navigateurs est de présenter un dialogue demandant de s'authentifier. On veut
// éviter cela, donc on ajoute un "x" au début.
class BasicStrategyModified extends BasicStrategy {
  constructor(options, verify) {
    return super(options, verify);
  }

  _challenge() {
    return 'xBasic realm="' + this._realm + '"';
  }
}


// ** Exercice 1.1 **
// Définition de la stratégie d'authentification avec Passport.js
//
// Vous devez mettre en place la statégie d'authentification Basic Auth pour
// la librairie Passport.js. Servez-vous de la classe BasicStrategyModified définie
// ci-haut. Tous les imports de modules (avec require(...)) sont déjà faits plus haut.
// Vous pouvez utiliser la fonction getLoginByUserAccountId() dans le module UserAccountQueries.js
// pour récupérer les informations d'un compte utilisateur selon l'identifiant passé dans le
// paramètre username. Assurez-vous de refuser l'authentification si la propriété isActive
// du compte utilisateur n'a pas la valeur true! Les hash et salt dans la BD sont encodés
// en base64. La fonction de hachage cryptographique employée est sha512, avec 100000 itérations.
// Référez-vous au app.js de l'exemple 1 du cours 19 pour voir la marche à suivre.
passport.use(new BasicStrategy((userAccountId, password, cb) => {
  userAccountQueries.getLoginByUserAccountId(userAccountId).then(utilisateur => {
    if (!utilisateur) {
      // L'utilisateur est introuvable, on appelle le callback cb
      // avec false en 2e paramètre
      return cb(null, false);
    }

    const iterations = 100000;
    const keylen = 64;
    const digest = "sha512";

    // Utilisation de la fonction pbkdf2() de la librairie crypto pour calculer le "hash"
    // du mot de passe:
    crypto.pbkdf2(password, utilisateur.motDePasseSalt, iterations, keylen, digest, (err, hashedPassword) => {
      if (err) {
        return cb(err);
      }

      // La colonne mot_de_passe_hash dans la BD contient le "hash" du mot de passe encodé
      // en base64, on le reconvertit en un buffer binaire pour l'utiliser avec la fonction
      // crypto.timingSafeEqual() :
      const utilisateurMdpHashBuffer = Buffer.from(utilisateur.motDePasseHash, "base64");

      // timingSafeEqual() fait la comparaison de deux buffers dans un temps constant, afin
      // de prévenir les attaques temporelles (où on cherche à découvrir une information secrète
      // selon le temps de calcul que nécessite une opération) :
      if (!crypto.timingSafeEqual(utilisateurMdpHashBuffer, hashedPassword)) {
        // Le mot de passe est incorrect, on appelle le callback cb
        // avec false en 2e paramètre
        return cb(null, false);
      }

      // L'authentification a réussi, on appelle le callback cb avec l'objet représentant
      // le compte utilisateur en 2e paramètre
      return cb(null, utilisateur);
    });
  }).catch(err => {
    return cb(err);
  });
}));
// passport.use( ... à compléter ... );


app.use('/products', productRouter);
app.use('/cart', cartRouter);
app.use('/orders', orderRouter);

// ** Exercice 1.2 **
// Route pour faire une authentification initiale et obtenir les
// informations du compte utilisateur.
//
// Il s'agit de fournir une méthode HTTP GET avec le chemin "/login" pour
// laquelle l'authentification est obligatoire. L'identifiant et le mot de passe
// seront fournis dans les en-têtes de la requête HTTP selon la méthode
// d'authentification Basic Auth. La stratégie pour Passport.js mise en place
// à l'exercice 1.1 devrait gérer cela, il suffit d'appeler correctement la fonction
// middleware passport.authenticate(...) pour la route afin que l'accès à celle-ci
// soit sécurisée. La méthode de route devrait ensuite avoir accès (via la propriété
// req.user) à l'objet du compte utilisateur défini et retourné depuis la stratégie
// d'authentification.
//
// La réponse en format JSON doit contenir les détails du compte utilisateur, soit
// les propriétés suivantes de l'objet req.user : userAccountId, userFullName,
// isAdmin et isActive. On omet les propriétés passwordHash et passwordSalt car celles-ci
// sont inutiles pour le front-end et leur interception pourrait accroître les risques
// liés à la sécurité.
//
// Référez-vous à la méthode de route /login définie dans app.js de l'exemple du cours 19.
// Une fois cette route complétée, vous pourrez tester celle-ci grâce à un client HTTP
// comme Insomnia en activant l'authentification Basic et en entrant les informations
// d'un compte utilisateur (p.ex. josbleau).

// app.get('/login', ... à compléter ...);
app.get('/login',
  passport.authenticate('basic',{session:false}),
  (req,res,next)=> {
    if(req.user){
      const userDetails = {
        userAccountId : req.user.user_account_id,
        userFullName : req.user.user_full_name,
        isAdmin : req.user.is_admin,
        isActive : req.user.is_active
      };

      res.json(userDetails);
    } else {
      return next({ status: 500, message: "Propriété user absente" });
    }
  }
)

// *** GESTION DES ERREURS ***

// Gestionnaire d'erreur, sera invoqué si on appelle next(...) en passant
// un objet d'erreur.
app.use((err, req, res, next) => {
  console.log("error handler: ", err);
  if (res.headersSent) {
    return next(err);
  }
  res.status(err.status || 500)
  if (err instanceof HttpError) {
    res.json(err.getJsonMessage());
  } else {
    res.json(err);
  }
});

module.exports = app;
