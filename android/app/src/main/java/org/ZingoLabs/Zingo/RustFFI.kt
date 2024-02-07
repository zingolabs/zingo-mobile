package org.ZingoLabs.Zingo

class RustFFI {
    companion object {
        external fun initlogging(): String
        external fun execute(cmd: String, args: String): String
        external fun initnew(
            serveruri: String,
            datadir: String,
            chainhint: String,
            monitor_mempool: String
        ): String

        external fun initfromseed(
            serveruri: String,
            seed: String,
            birthday: String,
            datadir: String,
            chainhint: String,
            monitor_mempool: String
        ): String

        external fun initfromufvk(
            serveruri: String,
            ufvk: String,
            birthday: String,
            datadir: String,
            chainhint: String,
            monitor_mempool: String
        ): String

        external fun initfromb64(
            serveruri: String,
            datab64: String,
            datadir: String,
            chainhint: String,
            monitor_mempool: String
        ): String

        external fun save(): String
        external fun getlatestblock(serveruri: String): String
    }
}