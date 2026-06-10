export const safeGoBack = (router, fallbackPath) => {
  if (typeof router?.canGoBack === 'function' && router.canGoBack()) {
    router.back();
    return;
  }

  router.replace(fallbackPath);
};
