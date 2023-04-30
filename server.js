const express = require("express");
const path = require("path");
const app = express();
const handlebars = require("express-handlebars");
const bodyParser = require("body-parser");
const clientSessions = require("client-sessions");
const libData = require("./libData");

app.engine(
  ".hbs",
  handlebars.engine({
    extname: ".hbs",
    defaultLayout: "main",
  })
);


app.set("view engine", ".hbs");
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, "public")));

app.use(
  clientSessions({
    cookieName: "session",
    secret: "iw3ouroiwehro2342kldsjfdsfafdskjkwbkcvhdsf",
    duration: 2 * 60 * 1000,
    activeDuration: 1000 * 60,
  })
);


app.use((req, res, next) => {
  res.locals.session = req.session;
  next();
});

let ensureLogin = (req, res, next) => {
  if (!req.session.user) {
    res.render("error", { message: "You must be logged in to view this page" });
  } else {
    next();
  }
};


app.get("/", (req, res) => {
  libData.getAllBooks().then((books) => {
    res.render("home", { data: books });
  });
});


app.get("/profile", ensureLogin, (req, res) => {
  libData
    .getBooksByUser(req.session.user.cardnumber)
    .then((books) => {
      res.render("profile", { data: books });
    })
    .catch((err) => {
      res.render("error", { message: "Some error occured" });
    });
});


app.post("/borrow", ensureLogin, (req, res) => {
  req.body.borrowedBy = req.session.user.cardnumber;
  libData
    .borrowBook(req.body)
    .then(() => {
      res.redirect("/");
    })
    .catch((err) => {
      res.render("error", { message: "Some error occured" });
    });
});


app.post("/return", ensureLogin, (req, res) => {
  req.body.borrowedBy = req.session.user.cardnumber;
  libData
    .returnBook(req.body)
    .then(() => {
      res.redirect("/profile");
    })
    .catch((err) => {
      res.render("error", { message: "Some error occured" });
    });
});


app.get("/login", (req, res) => {
  res.render("login");
});


app.post("/login", async (req, res) => {
  try {
    let user = await libData.checkUser(req.body);
    if (user) {
      req.session.user = {
        cardnumber: user.cardnumber,
      };
      res.redirect("/profile");
    }
  } catch (err) {
    res.render("error", { message: "Invalid login" });
  }
});


app.get("/logout", (req, res) => {
  req.session.reset();
  res.redirect("/");
});

libData.init().then(() => {
  app.listen(3000, () => {
    console.log("Server listening at port 3000");
  });
});
