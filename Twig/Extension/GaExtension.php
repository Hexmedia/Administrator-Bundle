<?php

namespace Hexmedia\AdministratorBundle\Twig\Extension;

use Hexmedia\AdministratorBundle\Model\Seo;
use Hexmedia\AdministratorBundle\Templating\Helper\SeoHelper;
use Symfony\Component\DependencyInjection\ContainerInterface;

/**
 * Provides an extension for Twig to output breadcrumbs
 */
class GaExtension extends \Twig_Extension
{
    private $container;

    public function __construct(ContainerInterface $container)
    {
        $this->container = $container;
    }

    /**
     * Returns a list of functions to add to the existing list.
     *
     * @return array An array of functions
     */
    public function getFunctions()
    {
        return array(
            "hex_ga"  => new \Twig_Function_Method($this, "showHeader", array("is_safe" => array("html"))),
        );
    }

    public function showHeader(array $options = []) {
        return $this->container->get("hexmedia.ga.helper")->render($options);
    }


    /**
     * Returns the name of the extension.
     *
     * @return string The extension name
     */
    public function getName()
    {
        return "hex_ga";
    }
}
