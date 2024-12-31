import Joi from "joi";

export const filterProductsSchema = Joi.object({
  filterDetails: {
    color: Joi.string()
      .pattern(/^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/)
      .message("Invalid hex color"),
    minPrice: Joi.string()
      .custom((value, helpers) => {
        const number = Number(value);
        if (isNaN(number)) {
          return helpers.error("any.invalid", {
            message: "minPrice must be a valid number",
          });
        }
        if (number < 0 || number > 9999) {
          return helpers.error("any.invalid", {
            message: "minPrice must be between 0 and 9999",
          });
        }
        return number;
      })
      .message("Price must be a number between 0 and 9999"),
    maxPrice: Joi.string()
      .custom((value, helpers) => {
        const number = Number(value);
        if (isNaN(number)) {
          return helpers.error("any.invalid", {
            message: "maxPrice must be a valid number",
          });
        }
        if (number < 0 || number > 9999) {
          return helpers.error("any.invalid", {
            message: "maxPrice must be between 0 and 9999",
          });
        }
        return number;
      })
      .message("Price must be a number between 0 and 9999"),
    category: Joi.string().valid("Men", "Women", "Kids").messages({
      "any.only": "Category must be one of: Men, Women, or Kids.",
    }),
    subCategory: Joi.string().valid(
      "Jackets",
      "Pullover",
      "Suits",
      "Pants",
      "T-Shirts",
      "Accessories"
    ),
    name: Joi.string(),
    onSale: Joi.boolean().truthy("true").falsy("false").optional(),
    inStock: Joi.string().valid("In Stock", "Out of Stock"),
    size: Joi.string().valid(
      "XXS",
      "XS",
      "S",
      "M",
      "L",
      "XL",
      "XXL",
      "XXXL",
      "One-Size"
    ),
    rating: Joi.string()
      .custom((value, helpers) => {
        const number = Number(value);
        if (isNaN(number)) {
          return helpers.error("any.invalid", {
            message: "rating must be a valid number",
          });
        }
        if (number < 0 || number > 5) {
          return helpers.error("any.invalid", {
            message: "rating must be between 0 and 5",
          });
        }
        return number;
      })
      .message("rating must be a number between 0 and 5"),
    page: Joi.number()
      .integer()
      .min(1)
      .optional()
      .default(1)
      .custom((value, helpers) => {
        if (typeof value !== "number") {
          return helpers.error("any.invalid", {
            message: "rating must be a valid number",
          });
        }
        return value;
      }),
    sortField: Joi.string().valid("price", "popularity", "rating").optional(),
    sortOrder: Joi.string().valid("asc", "desc").optional(),
  },
});
