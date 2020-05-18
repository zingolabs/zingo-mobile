#include <stdarg.h>
#include <stdbool.h>
#include <stdint.h>
#include <stdlib.h>

char *execute(const char *cmd, const char *args_list);

char *init_new(const char *server_uri);

char *initfromb64(const char *server_uri, const char *base64);

char *initfromseed(const char *server_uri, const char *seed, const char *birthday);

void rust_free(char *s);

char *save(void);
