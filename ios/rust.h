#include <stdarg.h>
#include <stdbool.h>
#include <stdint.h>
#include <stdlib.h>

void rust_free(char *s);

char *init_new(const char *server_uri, const char *data_dir, const char *chainhint);

char *initfromseed(const char *server_uri,
                   const char *seed,
                   const char *birthday,
                   const char *data_dir,
                   const char *chainhint);

char *initfromb64(const char *server_uri, const char *base64, const char *data_dir, const char *chainhint);

char *save(void);

char *execute(const char *cmd, const char *args_list);

char *get_latest_block(const char *server_uri);
