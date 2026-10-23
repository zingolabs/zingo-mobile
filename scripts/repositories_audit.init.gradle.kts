// Lists every Maven repository of every project once Gradle has evaluated
// all of them, one line per repository: "repository <project> <url>".
// Reading the url of the Binding Layer repository runs the fetch, so the
// listing names that repository without its url.
val bindingLayerRepositoryName = "bindingLayer"

gradle.projectsEvaluated {
    rootProject.allprojects {
        repositories.withType<MavenArtifactRepository>().forEach { repository ->
            val location = if (repository.name == bindingLayerRepositoryName) repository.name else repository.url.toString()
            println("repository $path $location")
        }
    }
}
