const express = require("express");
const axios = require("axios");
const router = express.Router();

// In-memory sample book data
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

// Middleware to check login
function requireLogin(req, res, next) {
  if (!req.session || !req.session.username) {
    return res.status(401).json({
      message: "Please log in to perform this action."
    });
  }
  next();
}

// Task 2: Retrieve all books
router.get("/books", (req, res) => {
  res.json(allBooks());
});

// Task 3: Retrieve a book by ISBN
router.get("/isbn/:isbn", (req, res) => {
  const book = findBook(req.params.isbn);

  if (!book) {
    return res.status(404).json({
      message: "Book not found."
    });
  }

  res.json(book);
});

// Task 4: Retrieve books by author
router.get("/author/:author", (req, res) => {
  const term = req.params.author.toLowerCase();

  const result = allBooks().filter((book) =>
    book.author.toLowerCase().includes(term)
  );

  res.json(result);
});

// Task 5: Retrieve books by title
router.get("/title/:title", (req, res) => {
  const term = req.params.title.toLowerCase();

  const result = allBooks().filter((book) =>
    book.title.toLowerCase().includes(term)
  );

  res.json(result);
});

// Task 6: Retrieve reviews for a book
router.get("/review/:isbn", (req, res) => {
  if (!findBook(req.params.isbn)) {
    return res.status(404).json({
      message: "Book not found."
    });
  }

  res.json(reviews.get(String(req.params.isbn)) || {});
});

// Task 7: Register a new user
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

  res.status(201).json({
    message: "User successfully registered."
  });
});

// Task 8: Login a registered user
router.post("/login", (req, res) => {
  const { username, password } = req.body || {};

  if (!username || users.get(username) !== password) {
    return res.status(401).json({
      message: "Invalid username or password."
    });
  }

  req.session.username = username;

  res.json({
    message: "Login successful.",
    username
  });
});

// Task 9: Add or update a book review
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

  res.json({
    message: "Review added/updated successfully.",
    reviews: bookReviews
  });
});

// Task 10: Delete a book review
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

  res.json({
    message: "Review deleted successfully."
  });
});

// Task 11: Axios helpers using async/await

// Retrieve all books
async function getAllBooks(baseURL = "http://localhost:5000") {
  const response = await axios.get(`${baseURL}/books`);
  return response.data;
}

// Retrieve a book by ISBN
async function getBookByISBN(
  isbn,
  baseURL = "http://localhost:5000"
) {
  const response = await axios.get(
    `${baseURL}/isbn/${encodeURIComponent(isbn)}`
  );

  return response.data;
}

// Retrieve books by author
async function getBooksByAuthor(
  author,
  baseURL = "http://localhost:5000"
) {
  const response = await axios.get(
    `${baseURL}/author/${encodeURIComponent(author)}`
  );

  return response.data;
}

// Retrieve books by title
async function getBooksByTitle(
  title,
  baseURL = "http://localhost:5000"
) {
  const response = await axios.get(
    `${baseURL}/title/${encodeURIComponent(title)}`
  );

  return response.data;
}

// Export router and helper functions
module.exports = router;

module.exports.getAllBooks = getAllBooks;
module.exports.getBookByISBN = getBookByISBN;
module.exports.getBooksByAuthor = getBooksByAuthor;
module.exports.getBooksByTitle = getBooksByTitle;