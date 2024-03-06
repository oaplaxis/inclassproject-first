import express from "express";
import dotenv from "dotenv";
import RoutesSetup from "./lib/RoutesSetup.js";
import MongooseSetup from "./lib/MongooseSetup.js";
import PassportSetup from "./lib/PassportSetup.js";
import session from "express-session";

// This loads our .env and adds the variables to the environment
dotenv.config();

// This creates our application
const app = express();

// Setup sessions
app.use(session({
    secret: process.env.SECRET_KEY,
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: (process.env.NODE_ENV === "production"),
        sameSite: (process.env.NODE_ENV === "production" ? "strict" : "lax")
    }
}));

// Setup Mongoose
MongooseSetup();

// Setup Passport
PassportSetup(app);

// This sets our view engine (HTML renderer)
app.set("view engine", "ejs");

// This sets the public assets folder
app.use(express.static("public"));
app.use(express.static("avatars"));

// Middleware to handle JSON
app.use(express.json());

// Middleware for parsing url-encoded requests
app.use(express.urlencoded({ extended: true }));

// Method overriding to deal with unsupported HTTP methods in certain platforms
app.use((req, _, next) => {
    if (req.body && typeof req.body === "object" && "_method" in req.body) {
        const method = req.body._method;

        delete req.body._method;

        req.method = method;
    }

    next();
});

RoutesSetup(app);

// Our error handler
app.use((error, req, res, __) => { // eslint-disable
    // Converts string errors to proper errors
    if (typeof error === "string") {
        const error = new Error(error);
    }

    if(error.status) error.status = 404; {
        res.status(error.status).render("errors/404");
    };

    // Adds a generic status
    if (!error.status) error.status = 404;

    // Outputs our error and stack trace to our console
    console.error(error);

    res.format({
        "text/html": () => {
            if (req.session) req.session.notifications = [{
                alertType: "alert-danger",
                message: error.message
            }];

            res.status(error.status).render("/errors/404");
        },
        "application/json": () => {
            res.status(error.status).json({status:error.status, message: error.message});
        },
        default: () => res.status(406).send("NOT ACCEPTABLE")
    });

    // Outputs the error to the user
    res.status(error.status).send(error.message);
});


/**
 * We are exporting our application so we are able to use it in
 * our tests
 */
export default app;
