type SignupRequest = {
  body: {
    name?: string;
    email: string;
    password: string;
  };
};

type SigninRequest = {
  body: {
    email: string;
    password: string;
  };
};



export { SigninRequest, SignupRequest };
