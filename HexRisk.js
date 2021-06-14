"use strict";

const express = require("express");
const app = express();
const path = require("path");

app.get("/", function (request, response) {
    response.sendFile(path.join(__dirname + "/code/Hex Risk/index.html"));
});

app.get("/common/:file", function(request, response) {
	response.sendFile(path.join(__dirname + "/code/" + request.params.file));
});

app.get("/:file", function(request, response) {
	response.sendFile(path.join(__dirname + "/code/Hex Risk/" + request.params.file));
});

const PORT = process.env.PORT || 8000;
app.listen(PORT);