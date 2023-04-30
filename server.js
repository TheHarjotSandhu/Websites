const express = require("express");
const path = require("path");
const app = express();
const handlebars = require("express-handlebars");
const bodyParser = require("body-parser");
const clientSessions = require("client-sessions");
const gymData = require("./gymData.js");

app.engine(
  ".hbs",
  handlebars.engine({
    extname: ".hbs",
    defaultLayout: "main",
  })
);
app.set("view engine", "hbs");
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static("public"));

app.use(
  clientSessions({
    cookieName: "session",
    secret: "iw3ouroiwehro2342kldsjfkjkwbkcvhdsf",
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
    res.redirect("/login");
  } else {
    next();
  }
};
app.get("/", async (req, res) => {
  let classes = await gymData.getClasses();
  res.render("sched", {
    schedule: { isActive: true },
    title: "Home",
    data: classes,
  });
});

app.get("/cart", ensureLogin, async (req, res) => {
  let cartDetails = await gymData.getCartDetails(req.session.user.username);
  if (cartDetails.length == 0) {
    res.render("cart", {
      cart: { isActive: true },
      title: "Cart",
      errMsg: "No classes in cart",
    });
    return;
  } else {
    let subTotal = cartDetails.length * 25;
    let tax = subTotal * 0.13;
    let total = subTotal + tax;
    let checkMonthly;
    try {
      checkMonthly = await gymData.checkMonthly(req.session.user.username);
    } catch (e) {
      console.log(e);
    }
    if (checkMonthly) {
      subTotal = 0;
      tax = 0;
      total = 0;
    }
    res.render("cart", {
      cart: { isActive: true },
      title: "Cart",
      data: cartDetails,
      subTotal: subTotal,
      tax: tax,
      total: total,
    });
  }
});

app.post("/book", ensureLogin, async (req, res) => {
  let body = req.body;
  body.username = req.session.user.username;
  try {
    await gymData.bookClass(body);
  } catch (e) {
    console.log(e);
  }

  res.redirect("/");
});
app.post("/remove", ensureLogin, async (req, res) => {
  let body = req.body;
  body.username = req.session.user.username;
  try {
    await gymData.removeCart(body);
  } catch (e) {
    console.log(e);
  }
  res.redirect("/cart");
});
app.post("/joinmonthly", ensureLogin, async (req, res) => {
  let body = req.body;
  if (body.join === "Cancel") {
    res.redirect("/cart");
    return;
  } else {
    body.classid = "Monthly Member";
    body.username = req.session.user.username;
    body.total = 75;
    try {
      await gymData.bookClass(body);
      await gymData.addPayment(body);
    } catch (e) {
      console.log(e);
    }
    res.redirect("/cart");
  }
});

app.post("/payclass", ensureLogin, async (req, res) => {
  let body = req.body;
  body.username = req.session.user.username;
  body.total = await gymData.getCartTotal(body.username);
  let checkMonthly;
  try {
    checkMonthly = await gymData.checkMonthly(req.session.user.username);
  } catch (e) {
    console.log(e);
  }
  if (checkMonthly) {
    await gymData.clearCart(body.username);
    res.redirect("/cart");
    return;
  } else {
    try {
      await gymData.addPayment(body);
    } catch (e) {
      console.log(e);
    }
    res.redirect("/cart");
  }
});

app.get("/login", async (req, res) => {
  res.render("login", { login: { isActive: true }, title: "Login" });
});
app.post("/login", async (req, res) => {
  let body = req.body;
  let type = body.type;
  if (type == "login") {
    await gymData
      .checkCredentials(body)
      .then(() => {
        req.session.user = {
          username: body.username,
        };
        res.redirect("/");
      })
      .catch((e) => {
        console.log(e);
      });
  }
  if (type == "signup") {
    await gymData
      .addUser(body)
      .then(() => {
        req.session.user = {
          username: body.username,
        };
        res.render("joinmonthly", { title: "Join Monthly" });
      })
      .catch((e) => {
        console.log(e);
      });
  }
});
app.get("/logout", async (req, res) => {
  req.session.reset();
  res.redirect("/");
});
app.get("/payments", ensureLogin, async (req, res) => {
  try {
    let payments = await gymData.getAllPayments(req.session.user.username);
    res.send(payments);
  } catch (e) {
    console.log(e);
    res.sendStatus(404);
  }
});
app.get("/joinmonthly",(req,res)=>{
  res.render("joinmonthly",{title:"Join Monthly"})
}
)

app.use("*", (req, res) => {
  res.sendStatus(404);
});

gymData.init().then(() => {
  app.listen(3000, () => {
    console.log("Server started on port 3000");
  });
});
