const express = require("express");
const axios = require("axios");

const router = express.Router();

// Sample book catalogue
const books = {
  "1": {
    isbn: "1",
    title: "The Great Gatsby",
    author: "F. Scott Fitzgerald",
    year: 1925
  },
  "2": {
    isbn: "2",
    title: "To Kill a Mockingbird",
    author: "Harper Lee",
    year: 1960
  },
  "3": {
    isbn: "3",
    title: "1984",
    author: "George Orwell",
    year: 1949
  },
  "4": {
    isbn: "4",
    title: "Pride and Prejudice",
    author: "Jane Austen",
    year: 1813
  },
  "5": {
    isbn: "5",
    title: "The Hobbit",
    author: "J.R.R. Tolkien",
    year: 1937
  }
};

const users = new Map();
const reviews = new Map();

const allBooks = () => Object.values(books);
const findBook = (isbn) => books[String(isbn)];

// Axios error formatter
function getAxiosErrorMessage(error) {
  if (error.response) {
    return `Request failed with status ${error.response.status}: ${
      error.response.data?.message ||
      error.response.statusText ||
      "Unexpected server response"
    }`;
  }

  if (error.request) {
    return "No response received from the server. Check that the API server is running and reachable.";
  }

  return error.message || "An unexpected error occurred while making the request.";
}

// Middleware: require login
function requireLogin(req, res, next) {
  if (!req.session || !req.session.username) {
    return res.status(401).json({
      message: "Please log in to perform this action."
    });
  }

  next();
}

// GET /books — retrieve all books
router.get("/books", (req, res) => {
  res.status(200).json(allBooks());
});

// GET /isbn/:isbn — retrieve a book by ISBN
router.get("/isbn/:isbn", (req, res) => {
  const book = findBook(req.params.isbn);

  if (!book) {
    return res.status(404).json({
      message: "Book not found."
    });
  }

  res.status(200).json(book);
});

// GET /author/:author — retrieve books by author
router.get("/author/:author", (req, res) => {
  const author = String(req.params.author || "")
    .trim()
    .toLowerCase();

  if (!author) {
    return res.status(400).json({
      message: "Author is required."
    });
  }

  const matches = allBooks().filter((book) =>
    book.author.toLowerCase().includes(author)
  );

  return res.status(200).json(matches);
});

// GET /title/:title — retrieve books by title
router.get("/title/:title", (req, res) => {
  const title = String(req.params.title || "")
    .trim()
    .toLowerCase();

  if (!title) {
    return res.status(400).json({
      message: "Title is required."
    });
  }

  const matches = allBooks().filter((book) =>
    book.title.toLowerCase().includes(title)
  );

  return res.status(200).json(matches);
});

// GET /review/:isbn — retrieve reviews for a book
router.get("/review/:isbn", (req, res) => {
  if (!findBook(req.params.isbn)) {
    return res.status(404).json({
      message: "Book not found."
    });
  }

  return res.status(200).json(
    reviews.get(String(req.params.isbn)) || {}
  );
});

// POST /register — register a user
router.post("/register", (req, res) => {
  const { username, password } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({
      message: "username and password are required."
    });
  }

  if (users.has(username)) {
    return res.status(409).json({
      message: "User already exists."
    });
  }

  users.set(username, password);

  return res.status(201).json({
    message: "User successfully registered."
  });
});

// POST /login — log in a registered user
router.post("/login", (req, res) => {
  const { username, password } = req.body || {};

  if (!username || users.get(username) !== password) {
    return res.status(401).json({
      message: "Invalid username or password."
    });
  }

  req.session.username = username;

  return res.status(200).json({
    message: "Login successful.",
    username
  });
});

// PUT /review/:isbn — add or update a review
router.put("/review/:isbn", requireLogin, (req, res) => {
  const isbn = String(req.params.isbn);

  if (!findBook(isbn)) {
    return res.status(404).json({
      message: "Book not found."
    });
  }

  const { review } = req.body || {};

  if (typeof review !== "string" || !review.trim()) {
    return res.status(400).json({
      message: "A non-empty review is required."
    });
  }

  const bookReviews = reviews.get(isbn) || {};

  bookReviews[req.session.username] = review.trim();

  reviews.set(isbn, bookReviews);

  return res.status(200).json({
    message: "Review added/updated successfully.",
    reviews: bookReviews
  });
});

// DELETE /review/:isbn — delete a review
router.delete("/review/:isbn", requireLogin, (req, res) => {
  const isbn = String(req.params.isbn);

  if (!findBook(isbn)) {
    return res.status(404).json({
      message: "Book not found."
    });
  }

  const bookReviews = reviews.get(isbn) || {};

  if (
    !Object.prototype.hasOwnProperty.call(
      bookReviews,
      req.session.username
    )
  ) {
    return res.status(404).json({
      message: "Review not found for this user."
    });
  }

  delete bookReviews[req.session.username];

  reviews.set(isbn, bookReviews);

  return res.status(200).json({
    message: "Review deleted successfully."
  });
});

// Axios helper: retrieve all books
async function getAllBooks(baseURL = "http://localhost:5000") {
  try {
    const response = await axios.get(`${baseURL}/books`);
    return response.data;
  } catch (error) {
    throw new Error(
      `Unable to retrieve books. ${getAxiosErrorMessage(error)}`
    );
  }
}

// Axios helper: retrieve a book by ISBN
async function getBookByISBN(
  isbn,
  baseURL = "http://localhost:5000"
) {
  try {
    const response = await axios.get(
      `${baseURL}/isbn/${encodeURIComponent(isbn)}`
    );

    return response.data;
  } catch (error) {
    throw new Error(
      `Unable to retrieve book by ISBN. ${getAxiosErrorMessage(error)}`
    );
  }
}

// Axios helper: retrieve books by author
async function getBooksByAuthor(
  author,
  baseURL = "http://localhost:5000"
) {
  try {
    const response = await axios.get(
      `${baseURL}/author/${encodeURIComponent(author)}`
    );

    return response.data;
  } catch (error) {
    throw new Error(
      `Unable to retrieve books by author. ${getAxiosErrorMessage(error)}`
    );
  }
}

// Axios helper: retrieve books by title
async function getBooksByTitle(
  title,
  baseURL = "http://localhost:5000"
) {
  try {
    const response = await axios.get(
      `${baseURL}/title/${encodeURIComponent(title)}`
    );

    return response.data;
  } catch (error) {
    throw new Error(
      `Unable to retrieve books by title. ${getAxiosErrorMessage(error)}`
    );
  }
}

// Export router and helper functions
module.exports = router;

module.exports.getAllBooks = getAllBooks;
module.exports.getBookByISBN = getBookByISBN;
module.exports.getBooksByAuthor = getBooksByAuthor;
module.exports.getBooksByTitle = getBooksByTitle;
module.exports.getAxiosErrorMessage = getAxiosErrorMessage;