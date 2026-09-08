const app = require("./app.js");
const { PORT } = require("./config/config.js");

sequelize.sync({ alter: true })
  .then(() => console.log('Database synced successfully'))
  .catch((err) => console.log('Error syncing database:', err));

module.exports = app;
