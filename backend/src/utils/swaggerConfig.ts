import swaggerJSDoc, { Options } from "swagger-jsdoc";

const options: Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Shop.co",
      version: "1.0.0",
      description: "API Documentation for my Shop.co Backend",
    },
    tags: [
      {
        name: "User",
        description: "Operations related to user registration and login.",
      },
      {
        name: "Authorization",
        description: "Operations related to user login and authentication.",
      },
      {
        name: "Cart Products",
        description: "Operations related to the products in the user cart.",
      },
    ],
    servers: [
      {
        url: "http://localhost:4000", // Change this later
      },
    ],
  },
  apis: ["./src/routes/*.ts"],
};

const swaggerDoc = swaggerJSDoc(options);

export default swaggerDoc;
