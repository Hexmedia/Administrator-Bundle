<?php

namespace Hexmedia\AdministratorBundle\Twig\Extension;

use Doctrine\ORM\EntityManager;
use Hexmedia\AdministratorBundle\Twig\TokenParser\ListSciptTokenParser;
use Hexmedia\ContentBundle\Entity\Page;
use Symfony\Component\Routing\RouterInterface;

class ListScriptExtension extends \Twig_Extension
{
    /**
     * @var \Symfony\Component\Routing\RouterInterface
     */
    private $router;

    public function __construct(RouterInterface $router)
    {
        $this->router = $router;
    }

    /**
     * {@inheritdoc}
     */
    public function getTokenParsers()
    {
        return [
            new ListSciptTokenParser()
        ];
    }

    /**
     * Returns the name of the extension.
     *
     * @return string The extension name
     */
    public function getName()
    {
        return "list_script_extension";
    }

    /**
     * @TODO This need to be compiled to js and saved in web with assetic:dump
     */
    public function get($namespace, $bundle, $controller)
    {
        return '<script type="text/javascript" src="' . $this->router->generate('HexMediaAdminListJs', [
            'namespace' => $namespace,
            'bundle' => $bundle,
            'controller' => $controller
        ]) . '"></script>';
    }
}