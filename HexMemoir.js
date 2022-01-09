"use strict";

const express = require("express");
const app = express();
const path = require("path");

app.get("/", function (request, response) {
    response.sendFile(path.join(__dirname + "/code/Hex Memoir/index.html"));
});

app.get("/common/:file", function(request, response) {
	response.sendFile(path.join(__dirname + "/code/" + request.params.file));
});

app.get("*", function(request, response) {
	response.sendFile(path.join(__dirname + "/code/Hex Memoir/" + request.originalUrl));
});

const PORT = process.env.PORT || 8000;
app.listen(PORT);