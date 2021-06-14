"use strict";

const express = require('express');
const app = express();

app.use(express.static('code'));
const PORT = process.env.PORT || 8000;
app.listen(PORT);