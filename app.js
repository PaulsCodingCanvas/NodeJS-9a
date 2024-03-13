const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const bcrypt = require("bcrypt");

const databasePath = path.join(__dirname, "userData.db");

const app = express();
app.use(express.json());

let database = null;

const initializeDbAndServer = async () => {
  try {
    database = await open({
      filename: databasePath,
      driver: sqlite3.Database,
    });

    app.listen(3000, () =>
      console.log("server running at http:/localhost:3000/")
    );
  } catch (error) {
    console.log(`DB error ${error.message}`);
    process.exit(1);
  }
};

initializeDbAndServer();

const validatePassword = (password) => {
  return password.length > 4;
};

app.post("/register", async (request, response) => {
  const { username, name, password, gender, location } = request.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const selectUserQuery = `SELECT * FROM user WHERE username='${username}';`;
  const databaseUser = await database.get(selectUserQuery);

  if (databaseUser === undefined) {
    const createUserQuery = `
    INSERT INTO
    user(username, name, password, gender, location )
    VALUES
    (
        '${username}',
        '${name}',
        '${password}',
        '${gender}',
        '${location}',
    );`;

    if (validatePassword(password)) {
      await database.run(createUserQuery);
      response.send("User created successfully");
    } else {
      response.status(400);
      response.send("Password is too short");
    }
  } else {
    response.status(400);
    response.send("User already exists");
  }
});

app.post("/login", async (request, response) => {
  const { username, password } = request.body;
  const selectUserQuery = `SELECT * FROM user WHERE username='${username}';`;
  const databaseUser = await database.get(selectUserQuery);

  if (databaseUser === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const isPasswordMatched = await bcrypt.compare(
      password,
      databaseUser.password
    );
    if (isPasswordMatched === true) {
      response.send("Login success!");
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

app.put("/change-password", async (request, response) => {
  const { username, oldPassword, newPassword } = request.body;
  const selectUserQuery = `SELECT * FROM user WHERE username='${username}';`;
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  try {
    const user = await database.get(selectUserQuery);
    if (user === undefined) {
      response.status(400);
      response.send("user Invalid");
    } else {
      const isPasswordMatched = await bcrypt.compare(
        oldPassword,
        user.password
      );
      if (isPasswordMatched === true) {
        if (validatePassword(newPassword)) {
          const updatePasswordQuery = `
            UPDATE
              user
            SET
              password='${hashedPassword}'
            WHERE
              username='${username}';`;
          await database.run(updatePasswordQuery);
          response.send("'Password updated");
        } else {
          response.status(400);
          response.send("Password is too short");
        }
      } else {
        response.status(400);
        response.send("Invalid current password");
      }
    }
  } catch (error) {
    response.status(500);
    response.send("Internal Server Error");
  }
});

module.exports = app;
