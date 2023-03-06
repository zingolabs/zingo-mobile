package org.ZingoLabs.Zingo

class RustFFI {
    companion object {
        external fun initlogging(): String
        external fun execute(cmd: String, args: String): String
        external fun initnew(
            serveruri: String,
            saplingOutputb64: String,
            saplingSpendb64: String,
            datadir: String
        ): String

        external fun initfromseed(
            serveruri: String,
            seed: String,
            birthday: String,
            saplingOutputb64: String,
            saplingSpendb64: String,
            datadir: String
        ): String

        external fun initfromb64(
            serveruri: String,
            datab64: String,
            saplingOutputb64: String,
            saplingSpendb64: String,
            datadir: String
        ): String

        external fun save(): String
        external fun getlatestblock(serveruri: String): String
    }
}