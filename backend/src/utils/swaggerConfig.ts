import swaggerJSDoc, { Options } from "swagger-jsdoc";

const options: Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Shop.Co",
      version: "v1",
      description: "API Documentation for Shop.Co Backend",
    },
    tags: [
      {
        name: "User",
        description: "Operations related to user registration and login.",
      },
      {
        name: "Public",
        description:
          "Operations related to Viewing, Searching or Filtering Products.",
      },
      {
        name: "Admin",
        description: "Operations related to Products.",
      },
      {
        name: "Admin Analytics",
        description: "Operations related to Shop.Co analytics.",
      },
    ],
    servers: [
      {
        url: "http://localhost:4000/api/",
      },
    ],
  },
  components: {
    securitySchemes: {
      BearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
    },
  },
  apis: ["./src/routes/*.ts"],
};

const swaggerDoc = swaggerJSDoc(options);

export default swaggerDoc;
