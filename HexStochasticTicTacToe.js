"use strict";

const express = require("express");
const app = express();
const path = require("path");

app.get("/", function (request, response) {
    response.sendFile(path.join(__dirname + "/code/Hex Stochastic Tic Tac Toe/index.html"));
});

app.get("/common/:file", function(request, response) {
	response.sendFile(path.join(__dirname + "/code/" + request.params.file));
});

app.get("/:file", function(request, response) {
	response.sendFile(path.join(__dirname + "/code/Hex Stochastic Tic Tac Toe/" + request.params.file));
});

app.use(express.static("code/Hex Stochastic Tic Tac Toe"));
const PORT = process.env.PORT || 8000;
app.listen(PORT);