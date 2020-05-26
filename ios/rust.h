#include <stdarg.h>
#include <stdbool.h>
#include <stdint.h>
#include <stdlib.h>

char *execute(const char *cmd, const char *args_list);

char *init_new(const char *server_uri, const char *sapling_output, const char *sapling_spend);

char *initfromb64(const char *server_uri,
                  const char *base64,
                  const char *sapling_output,
                  const char *sapling_spend);

char *initfromseed(const char *server_uri,
                   const char *seed,
                   const char *birthday,
                   const char *sapling_output,
                   const char *sapling_spend);

void rust_free(char *s);

char *save(void);
