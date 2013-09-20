<?php

namespace Hexmedia\AdministratorBundle\Filter;

use Assetic\Asset\AssetInterface;
use Assetic\Filter\FilterInterface;
use Symfony\Component\DependencyInjection\Exception\InactiveScopeException;
use Symfony\Component\Filesystem\Filesystem;
use Symfony\Component\DependencyInjection\Container;
use Assetic\Filter\HashableInterface;

class AssetsUrl implements FilterInterface, HashableInterface
{

    /**
     *
     * @var Container
     */
    private $container;

    public function __construct(Container $container)
    {
        $this->container = $container;
    }

    public function filterDump(AssetInterface $asset)
    {
        $this->doFilter($asset);
    }

    public function filterLoad(AssetInterface $asset)
    {
        $this->doFilter($asset);
    }

    private function doFilter(AssetInterface $asset)
    {
        $content = $asset->getContent();

        $callback = function ($matches) {
            $fs = new Filesystem();
            $resource = $matches['resource'];

            preg_match("/(\@{1,2})([A-Z][A-Za-z0-9\_\-]*)/", $resource, $matches);

            if ($resource{1} == "@") {
                $resource = substr($resource, 1);
            }

            try {
                $bundle = $this->container->get('kernel')->getBundle($matches[2]);
                $path = $this->container->get('kernel')->locateResource($resource);

                if ($fs->exists($path)) {
                    if (preg_match("/Resources\/public\/(.*)/", $path, $matches2)) {
                        $path = 'bundles/' . preg_replace(
                                '/bundle$/',
                                '',
                                strtolower($bundle->getName())
                            ) . '/' . $matches2[1];

                        if ($matches[1] == "@@") {
                            return $this->container->get('kernel')->getRootDir() . DIRECTORY_SEPARATOR . '..' . DIRECTORY_SEPARATOR . 'web' . DIRECTORY_SEPARATOR . $path;
                        }

                        try {
                            return $this->container->get('templating.helper.assets')->getUrl($path);
                        } catch (InactiveScopeException $e) {
                            return "../" . $path;
                        }
                    }
                }
            } catch (Exception$e) {

            }

            return $resource;
        };

        $pattern = "/(?P<resource>\@{1,2}[A-Za-z\_]+Bundle[A-Za-z0-9\_\.\/\-]*)/";

        $asset->setContent(preg_replace_callback($pattern, $callback, $content));
    }

    public function hash()
    {
        return microtime(true) . md5(microtime(true)); //always different
    }

}

?>
