<?php

namespace Hexmedia\AdministratorBundle\Templating\Helper;

use Hexmedia\AdministratorBundle\Model\Seo;
use Symfony\Component\Templating\EngineInterface;
use Symfony\Component\Templating\Helper\Helper;

class SeoHelper extends Helper
{

    /**
     * @var \Symfony\Component\Templating\EngineInterface
     */
    private $templating;
    /**
     * @var \Hexmedia\AdministratorBundle\Model\Seo
     */
    private $seo;
    /**
     * @var array
     */
    private $options;

    /**
     * Returns the canonical name of this helper.
     *
     * @return string The canonical name
     *
     * @api
     */
    public function getName()
    {
        return "hexmedia.seo.helper";
    }

    public function __construct(EngineInterface $templating, Seo $seo, array $options)
    {
        $this->templating = $templating;
        $this->seo = $seo;
        $this->options = $options;

    }

    public function render($options)
    {
        $this->resolveOptions($options);

        return $this->templating->render(
            $this->options['viewTemplate'],
            $this->options
        );
    }

    /**
     * Merges user-supplied options from the view
     * with base config values
     *
     * @param array $options
     * @return array
     */
    private function resolveOptions(array $options = array())
    {
        $this->options["seo"] = $this->seo;

        if (!$this->seo->getTitle() && $options['defaultTitle']) {
            $this->seo->setTitle($options['defaultTitle']);
        }

        if (!$this->seo->getTitle() && $options['defaultKeywords']) {
            $this->seo->setTitle($options['defaultKeywords']);
        }

        if (!$this->seo->getTitle() && $options['defaultDescription']) {
            $this->seo->setTitle($options['defaultDescription']);
        }

        return array_merge($this->options, $options);
    }

}